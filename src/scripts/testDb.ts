import { testConnection } from '../utils/testConnection';

async function main() {
  const success = await testConnection();
  if (!success) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 