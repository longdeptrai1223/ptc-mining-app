import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Đường dẫn đến file _redirects gốc
const redirectsFilePath = path.join(__dirname, '_redirects');
// Đường dẫn đến thư mục dist cho frontend
const distPublicPath = path.join(__dirname, 'dist', 'public');

// Đảm bảo thư mục dist/public tồn tại
if (!fs.existsSync(distPublicPath)) {
  console.error('Thư mục dist/public không tồn tại. Vui lòng chạy build trước.');
  process.exit(1);
}

// Đọc nội dung file _redirects
try {
  const redirectsContent = fs.readFileSync(redirectsFilePath, 'utf8');
  
  // Ghi nội dung vào dist/public/_redirects
  fs.writeFileSync(path.join(distPublicPath, '_redirects'), redirectsContent);
  console.log('Đã sao chép file _redirects thành công!');
} catch (error) {
  console.error('Lỗi khi sao chép file _redirects:', error);
  process.exit(1);
}