#!/usr/bin/env node

import { BackupService } from './backupService.js'
import { CONFIG } from './config.js'
import chalk from 'chalk'

/**
 * Show usage help
 */
function showHelp() {
  console.log(chalk.cyan.bold('📚 Payload CMS Backup Tool - Usage Guide'))
  console.log('')
  console.log(chalk.white('Usage:'))
  console.log('  npm start [environment]')
  console.log('  npm run backup [environment]')
  console.log('')
  console.log(chalk.white('Arguments:'))
  console.log('  environment  Target environment (test|prod) [default: test]')
  console.log('')
  console.log(chalk.white('Examples:'))
  console.log('  npm start test      # Backup test environment data')
  console.log('  npm start prod      # Backup production environment data')
  console.log('')
  console.log(chalk.white('Available environments:'))
  Object.keys(CONFIG).forEach(env => {
    const config = CONFIG[env]
    console.log(`  ${env.padEnd(6)} ${config.api_base || 'Not configured'}`)
  })
  console.log('')
  console.log(chalk.yellow('⚠️  Note: Please verify tool functionality in test environment before operating on production'))
}

/**
 * Parse command line arguments
 * @returns {object} Parsed arguments
 */
function parseArguments() {
  const args = process.argv.slice(2)
  
  /* Check if help is requested */
  if (args.includes('--help') || args.includes('-h')) {
    return { showHelp: true }
  }
  
  /* Get environment parameter */
  const env = args[0] || 'test'
  
  /* Validate environment parameter */
  if (!CONFIG[env]) {
    console.error(chalk.red(`❌ Unknown environment: ${env}`))
    console.error(chalk.yellow(`Available environments: ${Object.keys(CONFIG).join(', ')}`))
    process.exit(1)
  }
  
  return { env }
}

/**
 * Main function
 */
async function main() {
  try {
    const { showHelp: needHelp, env } = parseArguments()
    
    if (needHelp) {
      showHelp()
      return
    }
    
    /* Create backup service and execute backup */
    const backupService = new BackupService()
    const result = await backupService.performBackup(env)
    
    /* Set exit code based on result */
    if (result.success) {
      console.log('')
      console.log(chalk.green.bold('🎉 Backup completed successfully!'))
      process.exit(0)
    } else {
      console.log('')
      console.log(chalk.red.bold('❌ Errors occurred during backup'))
      process.exit(1)
    }
    
  } catch (error) {
    console.error('')
    console.error(chalk.red.bold('💥 Fatal error:'))
    console.error(chalk.red(error.message))
    
    if (process.env.NODE_ENV === 'development') {
      console.error('')
      console.error(chalk.gray('Debug information:'))
      console.error(error.stack)
    }
    
    process.exit(1)
  }
}

/* Run main function */
main() 