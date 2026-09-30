const fs = require('fs');
let content = fs.readFileSync('compose.yaml', 'utf8');

const webEnvSearch = `    environment:
      SESSION_SECRET: "\${SESSION_SECRET:?Set SESSION_SECRET in .env}"`;
const webEnvReplace = `    environment:
      GRADER_INTERNAL_URL: http://gateway:3002/grade-homework
      GRADER_INTERNAL_TOKEN: \${GRADER_INTERNAL_TOKEN:?Set GRADER_INTERNAL_TOKEN in .env}
      SESSION_SECRET: "\${SESSION_SECRET:?Set SESSION_SECRET in .env}"`;

const gatewayEnvSearch = `    environment:
      SITE_ORIGIN: "https://\${SITE_DOMAIN:?Set SITE_DOMAIN in .env}"`;
const gatewayEnvReplace = `    expose:
      - "3002"
    environment:
      GRADER_INTERNAL_TOKEN: \${GRADER_INTERNAL_TOKEN:?Set GRADER_INTERNAL_TOKEN in .env}
      GRADER_IMAGE: cyberbox-homework:1
      GRADER_PORT: "3002"
      SITE_ORIGIN: "https://\${SITE_DOMAIN:?Set SITE_DOMAIN in .env}"`;

content = content.replace(webEnvSearch, webEnvReplace);
content = content.replace(gatewayEnvSearch, gatewayEnvReplace);

fs.writeFileSync('compose.yaml', content);
