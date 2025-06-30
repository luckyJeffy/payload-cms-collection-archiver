import fs from 'fs-extra'
import path from 'path'
import { BACKUP_CONFIG } from '../config.js'

/**
 * File management utility class
 * Handles backup file saving, directory creation and logging
 */
export class FileManager {
  constructor(outputDir = BACKUP_CONFIG.outputDir) {
    this.outputDir = outputDir
    this.backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
  }
  
  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  async ensureDir(dirPath) {
    await fs.ensureDir(dirPath)
  }
  
  /**
   * Get backup directory path
   * @param {string} env - Environment name
   * @returns {string} Backup directory path
   */
  getBackupDir(env) {
    return path.join(this.outputDir, env, this.backupTimestamp)
  }
  
  /**
   * Get collection data file path
   * @param {string} env - Environment name
   * @param {string} collection - Collection name
   * @returns {string} File path
   */
  getCollectionDataPath(env, collection) {
    const backupDir = this.getBackupDir(env)
    return path.join(backupDir, 'data', `${collection}.json`)
  }
  
  /**
   * Get collection schema file path
   * @param {string} env - Environment name
   * @param {string} collection - Collection name
   * @returns {string} File path
   */
  getCollectionSchemaPath(env, collection) {
    const backupDir = this.getBackupDir(env)
    return path.join(backupDir, 'schemas', `${collection}.json`)
  }
  
  /**
   * Get backup metadata file path
   * @param {string} env - Environment name
   * @returns {string} File path
   */
  getMetadataPath(env) {
    const backupDir = this.getBackupDir(env)
    return path.join(backupDir, 'metadata.json')
  }
  
  /**
   * Get backup log file path
   * @param {string} env - Environment name
   * @returns {string} File path
   */
  getLogPath(env) {
    const backupDir = this.getBackupDir(env)
    return path.join(backupDir, 'backup.log')
  }
  
  /**
   * Save collection data to JSON file
   * @param {string} env - Environment name
   * @param {string} collection - Collection name
   * @param {Array} data - Data array
   * @returns {Promise<string>} Saved file path
   */
  async saveCollectionData(env, collection, data) {
    const filePath = this.getCollectionDataPath(env, collection)
    await this.ensureDir(path.dirname(filePath))
    
    const jsonData = {
      collection,
      timestamp: new Date().toISOString(),
      totalRecords: data.length,
      data
    }
    
    await fs.writeJson(filePath, jsonData, { spaces: 2 })
    console.log(`💾 Saved ${collection} data to: ${filePath}`)
    return filePath
  }
  
  /**
   * Save collection schema information to JSON file
   * @param {string} env - Environment name
   * @param {string} collection - Collection name
   * @param {object} schema - Schema information
   * @returns {Promise<string>} Saved file path
   */
  async saveCollectionSchema(env, collection, schema) {
    if (!BACKUP_CONFIG.saveCollectionSchema) {
      return null
    }
    
    const filePath = this.getCollectionSchemaPath(env, collection)
    await this.ensureDir(path.dirname(filePath))
    
    const schemaData = {
      collection,
      timestamp: new Date().toISOString(),
      ...schema
    }
    
    await fs.writeJson(filePath, schemaData, { spaces: 2 })
    console.log(`📋 Saved ${collection} schema to: ${filePath}`)
    return filePath
  }
  
  /**
   * Save backup metadata
   * @param {string} env - Environment name
   * @param {object} metadata - Metadata
   * @returns {Promise<string>} Saved file path
   */
  async saveMetadata(env, metadata) {
    const filePath = this.getMetadataPath(env)
    await this.ensureDir(path.dirname(filePath))
    
    const metadataWithTimestamp = {
      ...metadata,
      timestamp: new Date().toISOString(),
      backupVersion: '1.0.0'
    }
    
    await fs.writeJson(filePath, metadataWithTimestamp, { spaces: 2 })
    console.log(`📊 Saved backup metadata to: ${filePath}`)
    return filePath
  }
  
  /**
   * Add log entry
   * @param {string} env - Environment name
   * @param {string} level - Log level (INFO, WARN, ERROR)
   * @param {string} message - Log message
   * @param {object} extra - Extra information
   */
  async addLog(env, level, message, extra = {}) {
    if (!BACKUP_CONFIG.saveDetailedLogs) {
      return
    }
    
    const logPath = this.getLogPath(env)
    await this.ensureDir(path.dirname(logPath))
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...extra
    }
    
    const logLine = JSON.stringify(logEntry) + '\n'
    await fs.appendFile(logPath, logLine)
  }
  
  /**
   * Create backup directory structure
   * @param {string} env - Environment name
   */
  async createBackupStructure(env) {
    const backupDir = this.getBackupDir(env)
    
    await this.ensureDir(path.join(backupDir, 'data'))
    
    if (BACKUP_CONFIG.saveCollectionSchema) {
      await this.ensureDir(path.join(backupDir, 'schemas'))
    }
    
    console.log(`📁 Created backup directory structure: ${backupDir}`)
    return backupDir
  }
  
  /**
   * Generate backup summary
   * @param {string} env - Environment name
   * @param {Array} collections - Collections list
   * @param {object} stats - Statistics
   * @returns {Promise<string>} Summary file path
   */
  async generateSummary(env, collections, stats) {
    const backupDir = this.getBackupDir(env)
    const summaryPath = path.join(backupDir, 'README.md')
    
    const summary = `# Payload CMS Backup Summary

## Backup Information
- **Environment**: ${env}
- **Backup Time**: ${new Date().toISOString()}
- **Backup Version**: 1.0.0

## Statistics
- **Total Collections**: ${collections.length}
- **Total Records**: ${stats.totalRecords || 0}
- **Backup Duration**: ${stats.duration || 'N/A'}

## Collections List
${collections.map(col => `- **${col.name}**: ${col.count || 0} records`).join('\n')}

## Directory Structure
\`\`\`
${backupDir}/
├── data/           # Collection data files
${BACKUP_CONFIG.saveCollectionSchema ? '├── schemas/       # Collection schema information' : ''}
├── metadata.json   # Backup metadata
${BACKUP_CONFIG.saveDetailedLogs ? '├── backup.log      # Detailed logs' : ''}
└── README.md       # This summary file
\`\`\`

## Usage Instructions
1. \`data/\` directory contains complete data for each collection in JSON format
${BACKUP_CONFIG.saveCollectionSchema ? '2. `schemas/` directory contains structure information for each collection' : ''}
3. \`metadata.json\` contains backup metadata information
${BACKUP_CONFIG.saveDetailedLogs ? '4. `backup.log` contains detailed logs of the backup process' : ''}

---
Generated at: ${new Date().toISOString()}
`
    
    await fs.writeFile(summaryPath, summary, 'utf8')
    console.log(`📄 Generated backup summary: ${summaryPath}`)
    return summaryPath
  }
  
  /**
   * Check if backup directory exists
   * @param {string} env - Environment name
   * @returns {Promise<boolean>} Whether directory exists
   */
  async backupExists(env) {
    const backupDir = this.getBackupDir(env)
    return fs.pathExists(backupDir)
  }
  
  /**
   * Get latest backup directory
   * @param {string} env - Environment name
   * @returns {Promise<string|null>} Latest backup directory path, null if not exists
   */
  async getLatestBackup(env) {
    const envDir = path.join(this.outputDir, env)
    
    if (!await fs.pathExists(envDir)) {
      return null
    }
    
    const backups = await fs.readdir(envDir)
    if (backups.length === 0) {
      return null
    }
    
    /* Sort by timestamp, get the latest */
    backups.sort((a, b) => b.localeCompare(a))
    return path.join(envDir, backups[0])
  }
} 