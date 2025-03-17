import { Elysia } from 'elysia';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Đảm bảo thư mục uploads tồn tại
const uploadDir = join(process.cwd(), 'uploads', 'videos');
const thumbnailDir = join(process.cwd(), 'uploads', 'thumbnails');

if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
}

if (!existsSync(thumbnailDir)) {
    mkdirSync(thumbnailDir, { recursive: true });
}

// Middleware xử lý upload video
export const uploadMiddleware = new Elysia()
    .derive(async ({ request }) => {
        if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
            return { files: null };
        }

        try {
            const formData = await request.formData();
            const videoFile = formData.get('video') as File;

            if (!videoFile) {
                return { files: null, formData };
            }

            // Kiểm tra định dạng file
            const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
            if (!allowedTypes.includes(videoFile.type)) {
                throw new Error('Định dạng file không được hỗ trợ');
            }

            // Giới hạn kích thước file (100MB)
            const maxSize = 100 * 1024 * 1024;
            if (videoFile.size > maxSize) {
                throw new Error('Kích thước file vượt quá giới hạn (100MB)');
            }

            // Tạo tên file ngẫu nhiên
            const fileExt = extname(videoFile.name) || '.mp4';
            const fileName = `${randomUUID()}${fileExt}`;
            const filePath = join(uploadDir, fileName);

            // Lưu file
            const arrayBuffer = await videoFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const writeStream = createWriteStream(filePath);

            await new Promise<void>((resolve, reject) => {
                writeStream.write(buffer, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            writeStream.end();

            // Tạo thumbnail từ video sử dụng ffmpeg
            const thumbnailName = `${randomUUID()}.jpg`;
            const thumbnailPath = join(thumbnailDir, thumbnailName);

            await execAsync(`ffmpeg -i ${filePath} -ss 00:00:01 -frames:v 1 ${thumbnailPath}`);

            // Tính toán thời lượng video
            const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filePath}`);
            const duration = parseFloat(stdout.trim());

            return {
                files: {
                    video: {
                        fileName,
                        filePath,
                        fileUrl: `/uploads/videos/${fileName}`,
                        thumbnailName,
                        thumbnailPath,
                        thumbnailUrl: `/uploads/thumbnails/${thumbnailName}`,
                        duration: isNaN(duration) ? 0 : duration
                    }
                },
                formData
            };
        } catch (error:any) {
            console.error('Upload error:', error);
            throw new Error(`Lỗi khi xử lý upload: ${error.message}`);
        }
    });