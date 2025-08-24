# Use the official Puppeteer image
FROM ghcr.io/puppeteer/puppeteer:23.1.0

# Skip Puppeteer downloading Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Ensure we are running as root for permission changes
USER root
# Create Downloads directory and set permissions
RUN mkdir -p /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /home/pptruser/Downloads && \
    chown -R pptruser:pptruser /usr/src/app

# Switch to the non-root user
USER pptruser

# Expose the port
EXPOSE 10000

# Start the application
CMD ["node", "index.js"]