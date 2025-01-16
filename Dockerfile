# Use the official Node.js image from Docker Hub with the desired version.
FROM node:18.17.0

ARG PROD_DATABASE_URL

ENV DATABASE_URL=$PROD_DATABASE_URL

RUN mkdir /mo-backend

# Create a directory for your Node.js application and set it as the working directory.
WORKDIR /mo-backend

# Copy your application files into the container.
COPY . .

RUN ls /mo-backend

# Install the Node.js application dependencies.
RUN npm install

# Install Prisma globally
RUN npm install -g prisma

RUN npm run build

# Expose the port your application will run on.
EXPOSE 3000

# Copy the startup script into the container
COPY startup.sh /startup.sh

# Give execute permissions to the script
RUN chmod +x /startup.sh

# Set the script as the entry point
ENTRYPOINT ["/startup.sh"]
