#!/bin/bash
echo "Setting up CockroachDB for pagination tests..."

databases=(
  "defaultdb"
)

cockroach sql --insecure <<-EOSQL
-- Iterate over each database, drop if it exists, then create and grant privileges
$(for db in "${databases[@]}"; do
    echo "DROP DATABASE IF EXISTS \"$db\";"
    echo "CREATE DATABASE \"$db\";"
    echo "GRANT ALL PRIVILEGES ON DATABASE \"$db\" TO root;"
done)
EOSQL 