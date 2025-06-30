import fetch from 'node-fetch'
import pLimit from 'p-limit'
import { RATE_LIMIT_CONFIG } from '../config.js'

/**
 * Fetch-based Payload CMS API client
 * Avoids SSL configuration issues that can occur with axios
 */
export class FetchPayloadClient {
  constructor(config) {
    this.config = config
    this.baseURL = config.api_base
    this.apiKey = config.api_key
    
    /* Setup rate limiting */
    this.limit = pLimit(RATE_LIMIT_CONFIG.concurrency)
    
    /* Default request headers */
    this.defaultHeaders = {
      'Authorization': `users API-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Payload-CMS-Backup-Tool/1.0.0'
    }
  }
  
  /**
   * Add request delay for rate limiting
   */
  async delay() {
    if (RATE_LIMIT_CONFIG.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.delay))
    }
  }
  
  /**
   * Execute rate-limited API request
   * @param {Function} requestFn - Request function
   * @returns {Promise} Request result
   */
  async limitedRequest(requestFn) {
    return this.limit(async () => {
      await this.delay()
      return requestFn()
    })
  }
  
  /**
   * Send HTTP request
   * @param {string} path - Request path
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  async request(path, options = {}) {
    const url = `${this.baseURL}${path}`
    const config = {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    }
    
    console.log(`📤 API Request: ${config.method?.toUpperCase()} ${path}`)
    console.log(`📤 Headers:`, {
      'Authorization': config.headers.Authorization ? '***' : 'not set',
      'Content-Type': config.headers['Content-Type'],
      'Accept': config.headers['Accept']
    })
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), RATE_LIMIT_CONFIG.timeout)
      
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`✅ API Response: ${response.status} ${response.statusText}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ API Error: ${response.status} ${response.statusText}`)
        console.error(`Response:`, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        return await response.json()
      } else {
        return await response.text()
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`❌ API Request timeout for ${path}`)
        throw new Error(`Request timeout: ${path}`)
      }
      
      console.error(`❌ API Error: ${error.message}`)
      throw error
    }
  }
  
  /**
   * Test basic connection
   */
  async testBasicConnection() {
    try {
      console.log(`🔍 Testing basic connection to: ${this.baseURL}`)
      await this.request('/')
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.message
      }
    }
  }
  
  /**
   * Get API access information
   * @returns {Promise<object>} Access permissions data
   */
  async getAccess() {
    return this.limitedRequest(async () => {
      return await this.request('/access')
    })
  }
  
  /**
   * Discover all available collections
   * @returns {Promise<string[]>} Array of collection slugs
   */
  async discoverCollections() {
    try {
      const access = await this.getAccess()
      
      /* Extract collection names from access permissions */
      const collections = Object.keys(access.collections || {})
      
      if (collections.length === 0) {
        console.warn('⚠️  No collections found in access info.')
        return []
      }
      
      return collections
    } catch (error) {
      throw new Error(`Failed to discover collections: ${error.message}`)
    }
  }
  
  /**
   * Get document count in collection
   * @param {string} collection - Collection slug
   * @returns {Promise<number>} Number of documents
   */
  async getCollectionCount(collection) {
    return this.limitedRequest(async () => {
      const response = await this.request(`/${collection}/count`)
      return response.totalDocs
    })
  }
  
  /**
   * Get paginated collection data
   * @param {string} collection - Collection slug
   * @param {object} options - Query options
   * @returns {Promise<object>} Paginated data
   */
  async getCollectionData(collection, options = {}) {
    const {
      page = 1,
      limit = RATE_LIMIT_CONFIG.batchSize,
      depth = 2,
      sort = '-createdAt'
    } = options
    
    return this.limitedRequest(async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        depth: depth.toString(),
        sort
      })
      
      return await this.request(`/${collection}?${params}`)
    })
  }
  
  /**
   * Get all data from collection
   * @param {string} collection - Collection slug
   * @param {object} options - Query options
   * @returns {Promise<Array>} All documents
   */
  async getAllCollectionData(collection, options = {}) {
    const allDocs = []
    let currentPage = 1
    let hasNextPage = true
    
    console.log(`📦 Fetching all data from ${collection}...`)
    
    while (hasNextPage) {
      try {
        const data = await this.getCollectionData(collection, {
          ...options,
          page: currentPage
        })
        
        if (data.docs && data.docs.length > 0) {
          allDocs.push(...data.docs)
          console.log(`  📄 Retrieved page ${currentPage}, ${data.docs.length} records`)
          
          /* Check if there's a next page */
          hasNextPage = data.hasNextPage || (data.nextPage && data.nextPage > currentPage)
          currentPage++
        } else {
          hasNextPage = false
        }
      } catch (error) {
        console.error(`❌ Error fetching ${collection} page ${currentPage}:`, error.message)
        hasNextPage = false
      }
    }
    
    console.log(`✅ ${collection} data fetch complete, ${allDocs.length} total records`)
    return allDocs
  }
  
  /**
   * Get collection schema information
   * @param {string} collection - Collection slug
   * @returns {Promise<object>} Schema information
   */
  async getCollectionSchema(collection) {
    try {
      const data = await this.getCollectionData(collection, { limit: 1 })
      
      if (!data.docs || data.docs.length === 0) {
        return {
          collection,
          fields: [],
          totalDocs: 0,
          sampleDoc: null
        }
      }
      
      const sampleDoc = data.docs[0]
      const fields = Object.keys(sampleDoc).map(key => ({
        name: key,
        type: typeof sampleDoc[key],
        hasValue: sampleDoc[key] !== null && sampleDoc[key] !== undefined
      }))
      
      return {
        collection,
        fields,
        totalDocs: data.totalDocs || 0,
        sampleDoc
      }
    } catch (error) {
      console.error(`❌ Failed to get ${collection} schema:`, error.message)
      return {
        collection,
        fields: [],
        totalDocs: 0,
        sampleDoc: null,
        error: error.message
      }
    }
  }
} 