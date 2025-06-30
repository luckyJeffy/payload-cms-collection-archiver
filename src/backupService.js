import chalk from 'chalk'
import ora from 'ora'
import { FetchPayloadClient } from './utils/fetchPayloadClient.js'
import { FileManager } from './utils/fileManager.js'
import { getEnvConfig, isProductionEnv } from './config.js'

/**
 * Payload CMS backup service
 * Integrates API client and file manager for complete backup workflow
 */
export class BackupService {
  constructor() {
    this.spinner = ora()
    this.stats = {
      startTime: null,
      endTime: null,
      totalCollections: 0,
      totalRecords: 0,
      successfulCollections: 0,
      failedCollections: 0,
      errors: []
    }
  }
  
  /**
   * Show environment warning
   * @param {string} env - Environment name
   */
  showEnvironmentWarning(env) {
    if (isProductionEnv(env)) {
      console.log(chalk.red.bold('⚠️  Warning: You are accessing production environment!'))
      console.log(chalk.yellow('Production environment contains real data, please operate carefully.'))
      console.log(chalk.yellow('It is recommended to test in the testing environment first.'))
      console.log('')
    } else {
      console.log(chalk.green('✅ Current environment: Testing'))
      console.log('')
    }
  }
  
  /**
   * Validate API connection
   * @param {FetchPayloadClient} client - API client
   * @returns {Promise<boolean>} Whether connection is successful
   */
  async validateConnection(client) {
    this.spinner.start('Validating API connection...')
    
    try {
      const access = await client.getAccess()
      this.spinner.succeed('API connection validation successful')
      
      console.log(chalk.blue('📋 Access information:'))
      console.log(`  - Admin access: ${access.canAccessAdmin ? '✅' : '❌'}`)
      console.log(`  - Accessible collections: ${Object.keys(access.collections || {}).length}`)
      console.log('')
      
      return true
    } catch (error) {
      this.spinner.fail('API connection validation failed')
      console.error(chalk.red(`Error details: ${error.message}`))
      return false
    }
  }
  
  /**
   * Discover and analyze all collections
   * @param {FetchPayloadClient} client - API client
   * @param {FileManager} fileManager - File manager
   * @param {string} env - Environment name
   * @returns {Promise<Array>} Collection information list
   */
  async discoverCollections(client, fileManager, env) {
    this.spinner.start('Discovering available collections...')
    
    try {
      const collections = await client.discoverCollections()
      this.spinner.succeed(`Discovered ${collections.length} collections`)
      
      await fileManager.addLog(env, 'INFO', `Discovered ${collections.length} collections`, { collections })
      
      const collectionInfos = []
      
      for (const collection of collections) {
        this.spinner.start(`Analyzing collection: ${collection}`)
        
        try {
          /* Get basic collection information */
          const count = await client.getCollectionCount(collection)
          const schema = await client.getCollectionSchema(collection)
          
          collectionInfos.push({
            name: collection,
            count,
            schema,
            hasData: count > 0
          })
          
          this.spinner.succeed(`${collection}: ${count} records`)
          
          await fileManager.addLog(env, 'INFO', `Collection analysis complete: ${collection}`, {
            collection,
            count,
            fieldsCount: schema.fields?.length || 0
          })
          
        } catch (error) {
          this.spinner.fail(`Collection analysis failed: ${collection}`)
          console.error(chalk.yellow(`  Skipping collection ${collection}: ${error.message}`))
          
          await fileManager.addLog(env, 'WARN', `Collection analysis failed: ${collection}`, {
            collection,
            error: error.message
          })
          
          this.stats.errors.push({
            collection,
            phase: 'discovery',
            error: error.message
          })
        }
      }
      
      return collectionInfos
    } catch (error) {
      this.spinner.fail('Collection discovery failed')
      throw error
    }
  }
  
  /**
   * Backup a single collection
   * @param {FetchPayloadClient} client - API client
   * @param {FileManager} fileManager - File manager
   * @param {string} env - Environment name
   * @param {object} collectionInfo - Collection information
   * @returns {Promise<boolean>} Whether backup was successful
   */
  async backupCollection(client, fileManager, env, collectionInfo) {
    const { name: collection, count, schema } = collectionInfo
    
    if (count === 0) {
      console.log(chalk.gray(`⏭️  Skipping empty collection: ${collection}`))
      return true
    }
    
    this.spinner.start(`Backing up collection: ${collection} (${count} records)`)
    
    try {
      /* Get all data */
      const data = await client.getAllCollectionData(collection)
      
      /* Save data file */
      await fileManager.saveCollectionData(env, collection, data)
      
      /* Save schema information */
      await fileManager.saveCollectionSchema(env, collection, schema)
      
      /* Record statistics */
      this.stats.totalRecords += data.length
      this.stats.successfulCollections += 1
      
      this.spinner.succeed(`✅ ${collection}: ${data.length} records backed up`)
      
      await fileManager.addLog(env, 'INFO', `Collection backup successful: ${collection}`, {
        collection,
        recordsBackedUp: data.length,
        originalCount: count
      })
      
      return true
      
    } catch (error) {
      this.spinner.fail(`❌ ${collection}: Backup failed`)
      console.error(chalk.red(`  Error: ${error.message}`))
      
      this.stats.failedCollections += 1
      this.stats.errors.push({
        collection,
        phase: 'backup',
        error: error.message
      })
      
      await fileManager.addLog(env, 'ERROR', `Collection backup failed: ${collection}`, {
        collection,
        error: error.message
      })
      
      return false
    }
  }
  
  /**
   * Execute complete backup workflow
   * @param {string} env - Environment name (test|prod)
   * @param {object} options - Backup options
   * @returns {Promise<object>} Backup result
   */
  async performBackup(env = 'test', options = {}) {
    this.stats.startTime = new Date()
    
    console.log(chalk.cyan.bold('🚀 Payload CMS Data Backup Tool'))
    console.log(chalk.cyan('================================'))
    console.log('')
    
    /* Show environment warning */
    this.showEnvironmentWarning(env)
    
    try {
      /* Get environment configuration */
      const config = getEnvConfig(env)
      console.log(chalk.blue(`🔗 Target API: ${config.api_base}`))
      console.log('')
      
      /* Initialize client and file manager */
      const client = new FetchPayloadClient(config)
      const fileManager = new FileManager()
      
      /* Validate connection */
      const isConnected = await this.validateConnection(client)
      if (!isConnected) {
        throw new Error('API connection failed, cannot continue backup')
      }
      
      /* Create backup directory structure */
      const backupDir = await fileManager.createBackupStructure(env)
      
      /* Discover and analyze collections */
      const collections = await this.discoverCollections(client, fileManager, env)
      this.stats.totalCollections = collections.length
      
      if (collections.length === 0) {
        console.log(chalk.yellow('⚠️  No accessible collections found'))
        return this.getBackupResult(env, fileManager, collections)
      }
      
      console.log('')
      console.log(chalk.blue('🗂️  Collections overview:'))
      collections.forEach(col => {
        const status = col.hasData ? '📊' : '📋'
        console.log(`  ${status} ${col.name}: ${col.count} records`)
      })
      console.log('')
      
      /* Start data backup */
      console.log(chalk.green.bold('📦 Starting data backup...'))
      console.log('')
      
      for (const collection of collections) {
        await this.backupCollection(client, fileManager, env, collection)
      }
      
      /* Generate final report */
      return await this.generateFinalReport(env, fileManager, collections)
      
    } catch (error) {
      this.spinner.fail('Serious error occurred during backup')
      console.error(chalk.red.bold(`💥 Error: ${error.message}`))
      
      this.stats.errors.push({
        phase: 'general',
        error: error.message
      })
      
      return this.getBackupResult(env, null, [])
    }
  }
  
  /**
   * Generate final report
   * @param {string} env - Environment name
   * @param {FileManager} fileManager - File manager
   * @param {Array} collections - Collections list
   * @returns {Promise<object>} Backup result
   */
  async generateFinalReport(env, fileManager, collections) {
    this.stats.endTime = new Date()
    const duration = this.stats.endTime - this.stats.startTime
    
    console.log('')
    console.log(chalk.green.bold('✅ Backup complete!'))
    console.log(chalk.green('=================='))
    
    /* Save metadata */
    const metadata = {
      environment: env,
      collections: collections.map(col => ({
        name: col.name,
        recordCount: col.count,
        hasSchema: !!col.schema
      })),
      statistics: {
        ...this.stats,
        duration: `${Math.round(duration / 1000)}s`
      }
    }
    
    await fileManager.saveMetadata(env, metadata)
    
    /* Generate summary file */
    await fileManager.generateSummary(env, collections, {
      totalRecords: this.stats.totalRecords,
      duration: `${Math.round(duration / 1000)}s`
    })
    
    /* Display statistics */
    console.log('')
    console.log(chalk.blue('📊 Backup statistics:'))
    console.log(`  - Total collections: ${this.stats.totalCollections}`)
    console.log(`  - Successful backups: ${this.stats.successfulCollections}`)
    console.log(`  - Failed collections: ${this.stats.failedCollections}`)
    console.log(`  - Total records: ${this.stats.totalRecords}`)
    console.log(`  - Backup duration: ${Math.round(duration / 1000)}s`)
    
    if (this.stats.errors.length > 0) {
      console.log('')
      console.log(chalk.yellow('⚠️  Errors encountered:'))
      this.stats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.collection || error.phase}] ${error.error}`)
      })
    }
    
    console.log('')
    console.log(chalk.green(`💾 Backup files saved to: ${fileManager.getBackupDir(env)}`))
    
    return this.getBackupResult(env, fileManager, collections)
  }
  
  /**
   * Get backup result object
   * @param {string} env - Environment name
   * @param {FileManager} fileManager - File manager
   * @param {Array} collections - Collections list
   * @returns {object} Backup result
   */
  getBackupResult(env, fileManager, collections) {
    return {
      success: this.stats.failedCollections === 0 && this.stats.errors.length === 0,
      environment: env,
      backupPath: fileManager ? fileManager.getBackupDir(env) : null,
      statistics: this.stats,
      collections: collections.map(col => ({
        name: col.name,
        recordCount: col.count,
        backupSuccess: !this.stats.errors.some(err => err.collection === col.name)
      }))
    }
  }
} 