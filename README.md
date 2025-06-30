# Payload CMS Content Backup Tool

A Node.js tool for backing up Payload CMS data in JSON format for local retrieval and analysis.

## Features

- **Fast & Reliable**: Native fetch with built-in rate limiting
- **Complete Backup**: Backs up all accessible collections with data and schema
- **Environment Support**: Separate configurations for test and production
- **Detailed Logging**: Comprehensive logs and backup reports
- **Organized Output**: Well-structured backup files with metadata
- **Configurable**: Environment variables for all configuration options

## Installation

1. Clone the repository:
```bash
git clone https://github.com/luckyJeffy/payload-cms-collection-archiver.git
cd payload-cms-collection-archiver
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp env.example .env
```

Edit `.env` with your Payload CMS API endpoints and keys.

## Usage

### Basic Backup

Backup test environment:
```bash
npm run backup
```

Backup production environment:
```bash
npm run backup -- prod
```

### Available Scripts

- `npm start` - Interactive backup with environment selection
- `npm run backup` - Backup test environment  
- `npm run test-connection` - Test API connection

### Environment Configuration

The tool supports two environments:

- **test**: For development and testing
- **prod**: For production data (shows warning prompts)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TEST_API_BASE` | Test environment API base URL | - |
| `TEST_API_KEY` | Test environment API key | - |
| `PROD_API_BASE` | Production environment API base URL | - |
| `PROD_API_KEY` | Production environment API key | - |
| `RATE_LIMIT_CONCURRENCY` | Maximum concurrent requests | 6 |
| `RATE_LIMIT_DELAY` | Delay between requests (ms) | 500 |
| `RATE_LIMIT_BATCH_SIZE` | Documents per batch | 100 |
| `RATE_LIMIT_TIMEOUT` | Request timeout (ms) | 45000 |
| `BACKUP_OUTPUT_DIR` | Backup output directory | ./backup |
| `BACKUP_DEPTH` | Data relationship depth | 2 |

### Rate Limiting

Built-in rate limiting prevents overwhelming your Payload CMS server with configurable concurrency, delays, batch processing, and timeouts.

## Output Structure

Backups are organized in the following structure:

```
backup/
├── test/                          # Environment folder
│   ├── 2024-01-15_14-30-25/      # Timestamp folder
│   │   ├── data/                  # Collection data
│   │   │   ├── users.json
│   │   │   ├── posts.json
│   │   │   └── ...
│   │   ├── schemas/               # Collection schemas
│   │   │   ├── users.json
│   │   │   ├── posts.json
│   │   │   └── ...
│   │   ├── logs/                  # Backup logs
│   │   │   └── backup.log
│   │   ├── metadata.json          # Backup metadata
│   │   └── summary.txt            # Human-readable summary
│   └── latest -> 2024-01-15_14-30-25/  # Symlink to latest backup
```

## Data Format

### Collection Data File
```json
{
  "collection": "users",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalRecords": 150,
  "data": [
    {
      "id": "user-id-1",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
    // ... more records
  ]
}
```

### Schema Information File
```json
{
  "collection": "users",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "fields": [
    {
      "name": "id",
      "type": "string",
      "hasValue": true
    },
    {
      "name": "email", 
      "type": "string",
      "hasValue": true
    }
    // ... more fields
  ],
  "totalDocs": 150,
  "sampleDoc": { /* sample document */ }
}
```

## API Requirements

Your Payload CMS API must:

1. Have API routes enabled
2. Provide a valid API key with read access
3. Support the `/access` endpoint for permissions
4. Allow collection queries with pagination

### Required API Endpoints

- `GET /access` - Check permissions
- `GET /{collection}` - Get collection data
- `GET /{collection}/count` - Get document count

## Error Handling

The tool includes comprehensive error handling:

- **Connection Issues**: Validates API connectivity before backup
- **Permission Errors**: Checks access rights and skips inaccessible collections
- **Rate Limiting**: Respects server limits with automatic backoff
- **Partial Failures**: Continues backup even if some collections fail
- **Detailed Logging**: Records all errors for troubleshooting



## Security

- Keep API keys secure and use environment variables
- Test thoroughly before running production backups
- Store backup files securely as they may contain sensitive data
- Run backups in secure network environments

## Troubleshooting

### Common Issues

#### API Connection Failed
- Check network connectivity
- Verify API key is correct
- Ensure API base URL is accessible
- Check if API routes are enabled in Payload CMS

#### Permission Denied
- Verify API key has read permissions
- Check if collections are accessible with the provided key
- Ensure the API key hasn't expired

#### Rate Limiting Issues
- Reduce concurrency in configuration
- Increase delay between requests
- Check server-side rate limiting settings

## Development

### Project Structure

```
src/
├── backup.js              # Main backup script
├── backupService.js        # Core backup service
├── config.js              # Configuration management
├── index.js               # Interactive CLI
└── utils/
    ├── fetchPayloadClient.js  # API client
    ├── fileManager.js         # File operations
    └── testConnection.js      # Connection testing
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License 