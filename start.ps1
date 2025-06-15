# Read the .env file and set environment variables
$envContent = Get-Content .env
foreach ($line in $envContent) {
    if ($line -match '^([^=]+)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2]
        [Environment]::SetEnvironmentVariable($name, $value, 'Process')
    }
}

# Set NODE_ENV
$env:NODE_ENV = "development"

# Start the server
Write-Host "Starting server with DATABASE_URL: $env:DATABASE_URL"
npx tsx server/index.ts 