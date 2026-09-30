# Review: product_spec_ai_knowledge_assessment_platform.md

Reviewed on: 2026-05-09  
Source document: `docs/product_spec_ai_knowledge_assessment_platform.md`

## Overall Assessment

Tài liệu đã đủ tốt để mô tả ý tưởng MVP ở mức hackathon và giúp người đọc hiểu nhanh bài toán, giá trị sản phẩm, luồng chính và phạm vi tính năng. Tuy nhiên, ở góc độ dùng làm "contract" cho trợ lý AI hoặc cho đội triển khai, bản spec hiện tại vẫn còn một số khoảng trống quan trọng về bảo mật, độ tin cậy của analytics, tính công bằng của bài đánh giá và cơ chế kiểm soát chất lượng đầu ra AI.

## Findings

### 1. High: Public results dashboard đang có nguy cơ lộ dữ liệu đánh giá của người tham gia

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:42-51`, `:77-79`, `:117-118`, `:210-214`, `:255-258`, `:294-295`, `:359`
- Vấn đề: Tài liệu xác định có `Results Dashboard Link` công khai, không có authentication/RBAC, trong khi hệ thống lại lưu tên người tham gia, điểm số và thời điểm nộp bài. "Non-guessable token" chỉ giảm rủi ro đoán link, không giải quyết được rủi ro lộ link qua forward, chat, email hoặc demo.
- Tác động: Chỉ cần lộ link là bất kỳ ai có link cũng có thể xem dữ liệu đánh giá nội bộ. Đây là lỗ hổng bảo mật và riêng tư ở ngay luồng MVP chính.
- Khuyến nghị: Spec nên bổ sung tối thiểu một mô hình kiểm soát truy cập cho dashboard, ví dụ: link bí mật có thể rotate/revoke, passcode phụ, ẩn tên participant theo mặc định hoặc chỉ hiển thị pseudonym, và quy định rõ ai được phép xem dữ liệu này.
- Quyết định: phiên bản này không cần bảo mật link bí mật. Với mỗi bài kiểm tra thì sẽ có 1 link duy nhất, và hầu như chỉ có người tạo ra link này mới biết được link này. => không cần cơ chế bảo mật cho link Public results dashboard này. (Thành review). 

### 2. High: Analytics hiện chưa đáng tin vì mô hình định danh participant và chính sách attempt chưa được định nghĩa

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:47`, `:115-118`, `:237-245`, `:255-258`, `:268-273`
- Vấn đề: Participant chỉ cần nhập tên tự do rồi nộp bài. Tài liệu không định nghĩa một participant được phép làm bao nhiêu lần, có được đổi tên hay không, có cho phép trùng tên hay không, và duplicate prevention lại chỉ là "optional MVP enhancement" trong cùng browser session.
- Tác động: Kết quả analytics có thể bị nhiễu nghiêm trọng bởi nộp nhiều lần, tên giả, trùng tên, hoặc một người làm nhiều trình duyệt/thiết bị. Khi đó các chỉ số như average score, highest/lowest score và participant scores không còn đủ độ tin cậy để ra quyết định.
- Khuyến nghị: Cần định nghĩa rõ attempt policy ngay trong spec: một link tương ứng bao nhiêu attempt, participant identity tối thiểu là gì, cách xử lý tên trùng, cách ghi nhận retake, và dashboard hiển thị "latest / best / all attempts" theo quy tắc nào.
- Quyết định: Nhân viên sẽ nhập mã nhân viên của mình, không cho phép trùng tên (nhập trùng thì hệ thống sẽ tự thêm hậu tố thời gian (yyyyMMddhms) sau mã nhân viên để khỏi trùng). (Thành review). 

### 3. High: Việc random một subset câu hỏi cho mỗi người nhưng vẫn so sánh điểm trực tiếp là chưa công bằng và khó diễn giải

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:49`, `:223-231`, `:268-273`, `:315`, `:347`
- Vấn đề: Tài liệu yêu cầu mỗi participant nhận một randomized subset từ question bank, đồng thời dashboard lại hiển thị điểm, average score, highest/lowest score như thể các bài có độ khó tương đương. Nhưng spec chưa định nghĩa blueprint nào để cân bằng độ khó, chủ đề, số lượng câu theo difficulty hoặc coverage theo section tài liệu.
- Tác động: Hai participant có thể nhận các bài khác nhau đáng kể về độ khó và phạm vi, khiến việc so sánh điểm trực tiếp không còn hợp lệ. Điều này làm yếu giá trị của analytics và có thể gây tranh cãi với stakeholder.
- Khuyến nghị: Bổ sung quy tắc tạo quiz variant, ví dụ: mỗi bài luôn có cùng số câu theo từng difficulty, cùng coverage theo topic/section, hoặc bỏ so sánh điểm tuyệt đối giữa các variant nếu chưa có chuẩn hóa đủ tốt.

- Quyết định: Mục tiêu chính là để đánh giá được mức độ hiểu tài liệu của người làm bài nên không cần thiết phải tạo sự công bằng khi so sánh giữa các người làm khác nhau. Việc random chỉ là để các người làm bài không thể copy kết quả của nhau mà thôi. (Thành review)

### 4. High: Chất lượng đầu ra AI chưa có cơ chế kiểm soát, trong khi chỉnh sửa thủ công lại bị loại khỏi MVP

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:87-90`, `:188-200`, `:342-349`, `:368`
- Vấn đề: Tài liệu thừa nhận rủi ro AI tạo câu hỏi sai, nhưng không có bước review/approve, không có tiêu chí chất lượng tối thiểu, không có fallback khi output kém chất lượng. Đồng thời `Question editing interface` lại bị đưa ra ngoài MVP.
- Tác động: Nếu AI sinh câu hỏi sai fact, distractor vô lý hoặc đáp án đúng không nhất quán, đội triển khai vẫn technically "done" nhưng sản phẩm không usable trong demo thật hoặc pilot nội bộ.
- Khuyến nghị: Cần định nghĩa một control point trong MVP. Nếu chưa làm được UI chỉnh sửa, vẫn nên có bước "generate -> preview -> accept/regenerate" hoặc ít nhất là tiêu chí chặn publish khi output không đạt ngưỡng.
- Quyết định: Mục tiêu là để đơn giản hóa thao tác cho người tạo bộ câu hỏi nên không cần thiết phải có cơ chế chỉnh sửa thủ công. Người sở hữu bộ câu hỏi muốn thay đổi câu hỏi thì chỉ còn cách là thực hiện lại từ đầu để tạo bộ câu hỏi khác. (Thành review)

### 5. Medium: Output schema hiện quá mỏng cho grading ổn định sau randomization và cho analytics dài hạn

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:223-226`, `:319-335`
- Vấn đề: Schema ví dụ chỉ có `question`, `options`, `correctAnswer`, `explanation`, `difficulty`. Không có `questionId`, `optionId`, `sourceChunk`, `topic`, `version`, `documentId`, hay metadata phục vụ traceability.
- Tác động: Khi random thứ tự đáp án, cập nhật câu hỏi, regenerate bank hoặc tổng hợp question-level accuracy theo thời gian, hệ thống rất dễ gặp lỗi map dữ liệu hoặc không thể audit được nguồn gốc câu hỏi.
- Khuyến nghị: Nên chuẩn hóa schema tối thiểu theo hướng machine-friendly: có ID ổn định cho quiz, question, option; có document/version reference; có source span/chunk để truy vết.
- Quyết định: Tạo ID tăng dần cho bộ câu hỏi để khỏi trùng lặp. Lưu thời gian tạo bộ câu hỏi, để sau này có thể tự động xóa bộ câu hỏi theo thời gian, tránh dữ liệu rác. 

### 6. Medium: Phạm vi xử lý tài liệu và giả định hiệu năng còn mơ hồ

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:169-182`, `:280`, `:357-358`, `:369-371`
- Vấn đề: Tài liệu nói hỗ trợ PDF/DOCX/Markdown và hoàn tất generation trong 30 giây cho "standard documents", nhưng không định nghĩa "standard" là bao nhiêu trang/ký tự/token, có OCR hay không, có hỗ trợ tài liệu nhiều ngôn ngữ hay không, và xử lý bảng/ảnh/format lỗi như thế nào.
- Tác động: Đây là khoảng trống dễ gây lệch kỳ vọng giữa product và implementation. Một team có thể tối ưu cho PDF text-based 10 trang, trong khi stakeholder kỳ vọng PDF scan 80 trang vẫn hoạt động.
- Khuyến nghị: Bổ sung giới hạn MVP rõ ràng: số trang tối đa, dung lượng file tối đa, chỉ hỗ trợ text-based documents, không OCR ở MVP, và SLA áp dụng cho loại tài liệu nào.
- Quyết định: Tài liệu hỗ trợ là các tài liệu mà AI có thể đọc được. Chỉ là phiên bản đầu tiên nên không cần giới hạn trang/ký tự/token. Các tính năng nâng cao sẽ được phát triển ở phiên bản sau. 

### 7. Medium: Chưa có lifecycle rõ ràng cho job AI generation và các trường hợp lỗi

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:126-135`, `:179-182`, `:188-200`, `:280`
- Vấn đề: Luồng hiện tại mô tả như một happy path liên tục, nhưng không nói quiz generation là synchronous hay asynchronous, có trạng thái `processing/failed/retry` hay không, lỗi LLM timeout thì người dùng thấy gì, regenerate có ghi đè bank cũ không.
- Tác động: Thiếu lifecycle sẽ làm UX và backend state machine rất dễ bị phát sinh tranh cãi trong quá trình build. Đây là loại mơ hồ thường gây rework sát ngày demo.
- Khuyến nghị: Thêm section nhỏ về processing states, retry behavior, timeout, và nguyên tắc idempotency khi người dùng bấm generate lại.
- Quyết định: sẽ được triển khai trong các phiên bản sau. 

### 8. Medium: Thiếu yêu cầu về retention/deletion đối với tài liệu nội bộ và kết quả bài làm

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:179`, `:200`, `:257-259`, `:289-295`
- Vấn đề: Tài liệu nói sẽ lưu file upload, question bank, participant result và timestamp, nhưng không nói dữ liệu được giữ bao lâu, có thể xóa hay không, ai được xóa, và dữ liệu nào cần ẩn trong dashboard/export.
- Tác động: Với use case "internal knowledge documents", thiếu retention rule có thể khiến MVP đụng vấn đề compliance hoặc tối thiểu là gây lo ngại cho stakeholder khi pilot.
- Khuyến nghị: Nếu chưa cần chính sách đầy đủ, ít nhất nên chốt nguyên tắc MVP: retention ngắn hạn, có delete quiz/document, và dashboard không hiển thị nhiều PII hơn mức cần thiết.
- Quyết định: sẽ được triển khai trong các phiên bản sau. 

### 9. Medium: Success Criteria và Definition of Done còn thiên về demo, chưa đủ làm acceptance criteria cho chất lượng hệ thống

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:342-349`, `:402-410`
- Vấn đề: Các tiêu chí hiện chủ yếu là "có chạy end-to-end" và "demo-ready". Chưa có tiêu chí định lượng cho chất lượng quiz, tỷ lệ lỗi generation, độ chính xác chấm điểm, hay tính nhất quán dữ liệu analytics.
- Tác động: Team có thể hoàn thành đúng checklist nhưng vẫn giao một sản phẩm dễ lỗi, khó tin cậy hoặc không đủ giá trị sử dụng ngoài demo.
- Khuyến nghị: Bổ sung acceptance criteria định lượng tối thiểu, ví dụ: generation thành công với X% tài liệu trong phạm vi MVP, score calculation được kiểm thử với randomization, link token đủ entropy, và dashboard khớp dữ liệu submission.
- Quyết định: sẽ được triển khai trong các phiên bản sau. 

### 10. Low: User flow đang có lỗi encoding, làm giảm độ rõ ràng của tài liệu

- Evidence: `docs/product_spec_ai_knowledge_assessment_platform.md:126-161`
- Vấn đề: Các flow block xuất hiện ký tự lỗi như `竊・` thay vì bullet hoặc arrow chuẩn.
- Tác động: Không làm sai nghiệp vụ, nhưng làm giảm chất lượng trình bày và có thể là dấu hiệu file encoding/paste pipeline chưa ổn định.
- Khuyến nghị: Chuẩn hóa file sang UTF-8 và sửa lại các flow block trước khi dùng tài liệu làm nguồn cho AI assistant hoặc chia sẻ nội bộ.
- Quyết định: hãy sửa lại điểm này. 

## Open Questions

- Dashboard kết quả có dành cho một manager duy nhất hay có thể được chia sẻ cho nhiều người?
=> Quyết định: người nào có link đều có thể truy cập. 
- Một participant có được làm lại quiz không? Nếu có, hệ thống lấy attempt nào để tính thống kê?
=> Quyết định: có, nếu trùng thì hệ thống tự thêm hậu tố thời gian để phân biệt với kết quả trước. 

- "Standard document" trong mục hiệu năng được định nghĩa bằng số trang, số ký tự hay số token?
=> Quyết định: mức độ trung bình, bạn hãy tự chỉ định con số phù hợp. 

- MVP có chấp nhận publish quiz mà không có bước preview nội dung do AI sinh ra không?
=> Quyết định: không cần thiết. review bằng cách xem nội dụng ở link làm bài. Sau đó tự quyết định có gửi cho người khác hay tạo bài mới. 

- Dữ liệu participant name có thực sự cần là tên thật, hay chỉ cần alias/employee code?
=> Quyết định: chỉ cần là full name hoặc short name (ví dụ nd_thanh). 


## Positive Notes

- Cấu trúc tài liệu rõ ràng, dễ đọc, đi từ business problem tới requirements và DoD.
- Phạm vi MVP được giữ gọn, phù hợp bối cảnh hackathon.
- Luồng giá trị cốt lõi "upload -> generate -> share -> do quiz -> xem analytics" đã được mô tả nhất quán.
- Các mục Risks, Non-Goals và Future Enhancements đã tạo nền khá tốt cho vòng refine tiếp theo.
