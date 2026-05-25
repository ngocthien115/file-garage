REQUIREMENTS

# Dự án fg-cli

Mục đích của dự án này là tạo ra một công cụ dòng lệnh (CLI) để hỗ trợ người dùng thực hiện lệnh ngắn gọn hơn bằng cli-tool tích hợp vào máy của người dùng

# Cách sử dụng

- Người dùng sẽ cài đặt công cụ này thông qua curl(Unix-like) hoặc PowerShell(Windows)
- Sau khi cài đặt, người dùng có thể sử dụng lệnh `fg` để thực hiện các lệnh ngắn gọn hơn, ví dụ:
  - `fg ls` sẽ tương đương với `curl garage.mydomain.com/list`
  - `fg -u path/to/file -otp 112233` sẽ tương đương với `curl -X PUT -F "file=@path/to/file" garage.mydomain.com/upload`
  - `fg -g 1 -otp 112233` sẽ tương đương với `curl -X GET garage.mydomain.com/download/1`

# Giải thích các lệnh

- `ls`: Liệt kê các tệp tin có sẵn trên máy chủ, theo định dạng như

  ```
  ID: 1, Name: file1.txt, Size: 1MB
  ID: 2, Name: file2.txt, Size: 2MB
  ```

- `-u`: Tùy chọn để chỉ định đường dẫn đến tệp tin mà người dùng muốn tải lên máy chủ.
- `-otp`: Tùy chọn để chỉ định mã OTP (One-Time Password) cần thiết để xác thực khi thực hiện các lệnh tải lên hoặc tải xuống.
- `-g`: Tùy chọn để chỉ định ID của tệp tin mà người dùng muốn tải xuống từ máy chủ, khi tải xuống thì sẽ xuống ngay thư mục hiện tại.

# Lưu ý

- Người dùng cần đảm bảo rằng họ có kết nối internet để sử dụng công cụ này, vì nó sẽ gửi yêu cầu đến máy chủ từ xa.
- Mã OTP cần phải được cung cấp chính xác để thực hiện các lệnh tải lên hoặc tải xuống, nếu không sẽ gặp lỗi xác thực.
- Công cụ này chỉ hỗ trợ các lệnh đã được định nghĩa sẵn, người dùng không thể sử dụng các lệnh tùy chỉnh khác ngoài những lệnh đã được mô tả ở trên.

# Kết luận

Dự án fg-cli cung cấp một cách tiện lợi để người dùng thực hiện các lệnh ngắn gọn hơn thông qua một công cụ dòng lệnh tích hợp. Bằng cách sử dụng các lệnh đơn giản như `ls`, `-u`, `-otp`, và `-g`, người dùng có thể dễ dàng tương tác với máy chủ để liệt kê, tải lên, hoặc tải xuống các tệp tin một cách nhanh chóng và hiệu quả cho dự án chính `file-garage` phía trên.
