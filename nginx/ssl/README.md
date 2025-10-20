# SSL Certificates for Production

This directory should contain your SSL/TLS certificates for HTTPS in production.

## Using Let's Encrypt (Recommended - Free)

### Option 1: Certbot (Manual)

```bash
# Install certbot
sudo apt-get install certbot

# Generate certificates for your domain
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to this directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./fullchain.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./privkey.pem

# Set proper permissions
chmod 600 privkey.pem
chmod 644 fullchain.pem
```

### Option 2: Certbot with Docker Compose

Add this service to your `docker-compose.prod.yml`:

```yaml
  certbot:
    image: certbot/certbot
    volumes:
      - ./nginx/ssl:/etc/letsencrypt
      - ./certbot-webroot:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

## Using Custom Certificates

If you have purchased SSL certificates from a CA (Certificate Authority):

1. Place your certificate file as `fullchain.pem`
2. Place your private key as `privkey.pem`
3. Ensure proper permissions (600 for private key)

## File Structure

```
nginx/ssl/
├── README.md         # This file
├── fullchain.pem     # Your SSL certificate (public)
├── privkey.pem       # Your private key (secret - never commit!)
└── .gitignore        # Ensures private key is never committed
```

## Security

**IMPORTANT**: Never commit `privkey.pem` to version control!

The `.gitignore` in this directory prevents accidental commits.

## Self-Signed Certificate (Development/Testing Only)

For local testing with HTTPS (NOT for production):

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Automatic Renewal

Let's Encrypt certificates expire after 90 days. Set up auto-renewal:

```bash
# Add to crontab (runs daily at 3am)
0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /path/to/docker-compose.prod.yml restart nginx"
```

## Verify Configuration

After setting up SSL:

```bash
# Test Nginx configuration
docker-compose -f docker-compose.prod.yml exec nginx nginx -t

# Check certificate expiry
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates
```

## SSL/TLS Best Practices

- Use TLS 1.2+ only (TLS 1.0/1.1 deprecated)
- Enable HSTS header (`Strict-Transport-Security`)
- Use strong cipher suites (see nginx.prod.conf)
- Enable OCSP stapling for faster verification
- Test your SSL configuration at: https://www.ssllabs.com/ssltest/
