import { type PresetPrompt, type ImageAspectRatio, type ImageResolution } from './types';

export const MAX_VIDEO_POLLING_ATTEMPTS = 60; // 60 attempts * 10 seconds = 10 minutes max
export const VIDEO_POLLING_INTERVAL_MS = 10000; // Poll every 10 seconds

export const PRESET_PROMPTS: PresetPrompt[] = [
  {
    name: "Phối cảnh sản phẩm sang trọng",
    prompt: "Ảnh studio sang trọng và tinh tế của sản phẩm, với ánh sáng dịu nhẹ, định hướng làm nổi bật các tính năng cao cấp. Nền là một bề mặt tối giản, bóng loáng phản chiếu sản phẩm, đặt trên một gradient màu sắc đậm, phong phú. Thêm hơi nước hoặc sương mù nhẹ nhàng, tinh tế để tạo vẻ huyền ảo. Sản phẩm được đặt ở trung tâm và lấy nét hoàn hảo."
  },
  {
    name: "Tươi mới lấy cảm hứng từ thiên nhiên",
    prompt: "Sản phẩm đặt trong khung cảnh thiên nhiên sống động, bao quanh bởi cây xanh tươi tốt và những giọt nước trong vắt. Ánh nắng mặt trời nhẹ nhàng xuyên qua lá, tạo không khí trong lành và sảng khoái. Nhấn mạnh các kết cấu hữu cơ và cảm giác tinh khiết tự nhiên. Sản phẩm nên tạo cảm giác tươi mát và gần gũi với thiên nhiên."
  },
  {
    name: "Phong cách tối giản hiện đại",
    prompt: "Một bố cục sạch sẽ, hiện đại và tối giản nổi bật với sản phẩm trên nền trắng hoặc xám nhạt tinh khiết. Sử dụng các hình dạng hình học và bóng đổ tinh tế để tạo chiều sâu. Sản phẩm là trọng tâm duy nhất, với các chi tiết sắc nét và cảm giác đơn giản tinh tế. Ánh sáng đều, sáng sủa."
  },
  {
    name: "Ảnh hành động sống động",
    prompt: "Sản phẩm trong một môi trường năng động, tràn đầy năng lượng, gợi cảm giác chuyển động và hiệu quả. Có thể là nước bắn tung tóe, các hạt bay lượn, hoặc nền mờ ảo thể hiện tốc độ. Sử dụng ánh sáng mạnh, ấn tượng để tạo hiệu ứng thị giác. Sản phẩm nên truyền tải sức mạnh và hiệu suất."
  },
  {
    name: "Không gian ấm cúng tại nhà",
    prompt: "Một khung cảnh ấm áp và mời gọi, với sản phẩm được tích hợp vào một không gian gia đình ấm cúng. Ánh sáng dịu nhẹ, khuếch tán từ cửa sổ hoặc đèn. Các kết cấu của gỗ tự nhiên, vải mềm mại hoặc gốm sứ ấm áp. Tạo cảm giác thoải mái, thư giãn và sang trọng hàng ngày. Sản phẩm nên tạo cảm giác dễ tiếp cận và thiết yếu."
  }
];

export const IMAGE_RESOLUTION_PRESETS: {
  [key in ImageAspectRatio]: { [key2 in ImageResolution]: string }
} = {
  '1:1': { '2K': '2048x2048 px', '4K': '4096x4096 px', '8K': '8192x8192 px' },
  '3:4': { '2K': '1536x2048 px', '4K': '3072x4096 px', '8K': '6144x8192 px' },
  '4:3': { '2K': '2048x1536 px', '4K': '4096x3072 px', '8K': '8192x6144 px' },
  '9:16': { '2K': '1152x2048 px', '4K': '2304x4096 px', '8K': '4608x8192 px' },
  '16:9': { '2K': '2048x1152 px', '4K': '4096x2304 px', '8K': '8192x4608 px' },
};