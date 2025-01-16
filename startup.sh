#!/bin/bash

# Running Prisma Migrate
echo "Running Prisma Migrate..."
npx prisma migrate deploy

# Check if Prisma migrate was successful
if [ $? -eq 0 ]; then
    echo "Prisma migrate completed successfully."

    # Generate Prisma client
    echo "Generating Prisma client..."
    npx prisma generate

    # Check if Prisma client generation was successful
    if [ $? -eq 0 ]; then
        echo "Prisma client generation completed successfully."
        # Start the application
        echo "Starting application..."
        npm run start:prod
    else
        echo "Prisma client generation failed."
        exit 1
    fi
else
    echo "Prisma migrate failed."
    exit 1
fi
