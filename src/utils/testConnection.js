import chalk from 'chalk'
import { FetchPayloadClient } from './fetchPayloadClient.js'
import { getEnvConfig } from '../config.js'

/**
 * Test API connection and permissions
 * @param {string} env - Environment name
 */
export async function testConnection(env = 'test') {
  console.log(chalk.cyan.bold('🔧 API Connection Test Tool'))
  console.log(chalk.cyan('=========================='))
  console.log('')
  
  try {
    const config = getEnvConfig(env)
    console.log(chalk.blue(`🌍 Test environment: ${env}`))
    console.log(chalk.blue(`🔗 API URL: ${config.api_base}`))
    console.log('')
    
    const client = new FetchPayloadClient(config)
    
    /* Test basic connection */
    console.log(chalk.yellow('📡 Testing API connection...'))
    const access = await client.getAccess()
    console.log(chalk.green('✅ API connection successful'))
    
    /* Display permission information */
    console.log('')
    console.log(chalk.blue('🔐 Access permissions:'))
    console.log(`  Admin access: ${access.canAccessAdmin ? '✅' : '❌'}`)
    
    const collections = Object.keys(access.collections || {})
    console.log(`  Accessible collections: ${collections.length}`)
    
    if (collections.length > 0) {
      console.log('')
      console.log(chalk.blue('📚 Available collections:'))
      
      for (const collection of collections.slice(0, 5)) {
        try {
          const count = await client.getCollectionCount(collection)
          console.log(`  ✅ ${collection}: ${count} records`)
        } catch (error) {
          console.log(`  ❌ ${collection}: ${error.message}`)
        }
      }
      
      if (collections.length > 5) {
        console.log(`  ... ${collections.length - 5} more collections`)
      }
    }
    
    console.log('')
    console.log(chalk.green.bold('🎉 Connection test complete!'))
    return true
    
  } catch (error) {
    console.log('')
    console.log(chalk.red.bold('❌ Connection test failed'))
    console.error(chalk.red(`Error details: ${error.message}`))
    
    /* Provide troubleshooting suggestions */
    console.log('')
    console.log(chalk.yellow('💡 Troubleshooting suggestions:'))
    console.log('  1. Check network connectivity')
    console.log('  2. Verify API key is correct')
    console.log('  3. Ensure API URL is accessible')
    console.log('  4. Check API key permissions')
    
    return false
  }
}

/**
 * Execute test if this file is run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.argv[2] || 'test'
  testConnection(env)
    .then(success => {
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error(chalk.red('Fatal error:', error.message))
      process.exit(1)
    })
} 