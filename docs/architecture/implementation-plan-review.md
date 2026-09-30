# Review: implementation-plan.md

Reviewed on: 2026-05-09  
Source document: `docs/architecture/implementation-plan.md`

## Overall Assessment

Tài liệu implementation plan rất mạnh ở mặt thực thi: chia phase rõ, task cụ thể, có acceptance criteria, có guidance tốt cho AI-assisted coding và giữ được tinh thần MVP/hackathon. Ở mức roadmap để đội build nhanh, đây là một bản plan khá dùng được.

Tuy nhiên, vẫn có một số điểm mâu thuẫn nội bộ hoặc thiếu bước thực thi quan trọng. Các điểm này không chỉ là "có thể polish thêm", mà có thể dẫn tới build sai contract, acceptance không đạt được, hoặc dashboard/demo cho ra kết quả sai lệch.

## Findings

### 1. High: Phase 3 cho phép persist quiz thiếu câu, nhưng Phase 4/5 lại giả định `quiz.questionCount` là số câu thực tế participant phải trả lời

- Evidence: `docs/architecture/implementation-plan.md:332`, `:351-362`, `:369`, `:415-417`, `:476-483`, `:617-618`
- Vấn đề: Phase 3 nói hệ thống tạo quiz với `N questions`, nhưng phần error recovery lại cho phép drop chunk lỗi và chỉ fail khi tổng câu hợp lệ xuống dưới `requested * 0.6`. Acceptance cũng chỉ yêu cầu ">= 8 valid questions" thay vì đúng `questionCount`. Trong khi đó Phase 4 dùng `selectQuestions(bank, quiz.questionCount)` với `Math.min(n, arr.length)`, và Phase 5 bắt buộc `answers.length === quiz.questionCount`.
- Tác động: Nếu quiz được persist với bank nhỏ hơn `quiz.questionCount`, participant có thể chỉ nhìn thấy ít câu hơn nhưng submit contract vẫn đòi đủ `questionCount`. Đây là lỗi contract nghiêm trọng giữa generation, rendering và submission.
- Khuyến nghị: Chọn một trong hai hướng và ghi rõ trong plan:
  - Chỉ persist khi đã có đủ số câu để phục vụ đúng `quiz.questionCount`.
  - Hoặc ghi `quiz.questionCount` theo số câu thực tế đã persist và cập nhật toàn bộ contract/acceptance theo hướng đó.
> Quyết định: ở màn hình tạo câu hỏi có mục nhập số lượng câu hỏi. AI sẽ tạo ra số lượng câu hỏi theo số lượng câu hỏi đã nhập. (Thành review). 

### 2. High: Công thức `questionAccuracy` hiện sẽ hiển thị 0% cho câu hỏi chưa từng xuất hiện trong attempt nào

- Evidence: `docs/architecture/implementation-plan.md:461-464`, `:696-704`
- Vấn đề: Quiz được random subset theo từng pageview, nên có những câu trong bank chưa từng được participant nhìn thấy. Nhưng query analytics dùng `LEFT JOIN` và `AVG(CASE WHEN aa."isCorrect" THEN 1.0 ELSE 0.0 END)`, nên khi không có bản ghi `attempt_answers`, câu hỏi đó vẫn bị tính thành `0.0`.
- Tác động: Dashboard sẽ diễn giải "chưa có dữ liệu" thành "0% correct", làm sai meaning của analytics, đặc biệt ở giai đoạn đầu khi số lượt làm bài còn ít.
- Khuyến nghị: Tách hai trạng thái `no data` và `0% correct`. Ví dụ chỉ average trên bản ghi thật, hoặc trả thêm `attemptCount` và để UI hiển thị `No attempts yet` khi count = 0.
- Quyết định: Tách hai trạng thái `no data` và `0% correct`. Ví dụ chỉ average trên bản ghi thật, hoặc trả thêm `attemptCount` và để UI hiển thị `No attempts yet` khi count = 0. (Thành review). 

### 3. Medium: Phase 0 hứa hẹn deliverable `green CI` và `.env.example`, nhưng task list không giao việc rõ ràng để tạo chúng

- Evidence: `docs/architecture/implementation-plan.md:59`, `:107-126`, `:130-132`, `:142-147`
- Vấn đề: Phần overview nói Phase 0 kết thúc với `green CI`, và deliverables có `.env.example` đã commit. Nhưng task list không có bước tạo CI workflow, không có bước tạo `.env.example`, và acceptance criteria cũng không verify CI.
- Tác động: Đây là khoảng trống ownership. Team có thể nghĩ Phase 0 xong dù CI chưa tồn tại hoặc `.env.example` chưa được tạo, trong khi overview lại ngầm coi đó là điều kiện xong phase.
- Khuyến nghị: Hoặc thêm task/acceptance rõ ràng cho CI và `.env.example`, hoặc bỏ chúng khỏi deliverables/overview để giảm ambiguity.
> Quyết định: bỏ chúng khỏi deliverables/overview để giảm ambiguity.

### 4. Medium: Phase 1 đặt acceptance cho seeded row trên preview deployment nhưng plan không chỉ ra cách seed preview DB

- Evidence: `docs/architecture/implementation-plan.md:181-182`, `:209-221`
- Vấn đề: Task có tạo `prisma/seed.ts` và push migration lên Vercel preview, còn acceptance yêu cầu `prisma.document.findFirst()` trả seeded row từ preview deployment. Nhưng phần seed strategy lại nói "Seed only locally for testing" và không có task nào chạy seed vào preview database.
- Tác động: Acceptance hiện không thực thi được như viết ra. Đây là dạng mơ hồ dễ làm team mất thời gian tranh luận "preview có cần seed hay không".
- Khuyến nghị: Chốt một trong hai cách:
  - Bỏ acceptance yêu cầu seeded row trên preview.
  - Hoặc thêm bước explicit để seed preview DB bằng script/manual command.
> Quyết định: Bỏ acceptance yêu cầu seeded row trên preview.

### 5. Medium: Phase 4 vừa yêu cầu build API route randomized quiz, vừa nói page component mới là nơi nên randomize

- Evidence: `docs/architecture/implementation-plan.md:449-450`, `:502-503`
- Vấn đề: Task list yêu cầu `app/api/quizzes/[token]/route.ts`, nhưng implementation notes lại nói randomization nên làm trong page component vì page đã có data và API round-trip chỉ nhân đôi công việc.
- Tác động: Trong một plan `< 3 days`, đây là duplicate scope. Nếu cả API route và page đều randomize, team sẽ phải duy trì hai đường dữ liệu gần như giống nhau, dễ lệch behavior và tốn thời gian không cần thiết cho MVP.
- Khuyến nghị: Chọn một source of truth cho MVP. Nếu page RSC là luồng chính, nên defer API này cho phase sau hoặc ghi rõ nó là optional/future hook.
> Quyết định: Thời điểm tạo câu hỏi sẽ sinh ra gấp đôi số câu hỏi theo người dùng nhập vào. Sau đó phía client sẽ chỉ cần randome trong danh sách số câu hỏi đã được tạo để chọn câu hỏi hiển thị.

### 6. Medium: Chiến lược warm-up cho demo đang target sai endpoint nên không thực sự giảm rủi ro cold start của quiz generation

- Evidence: `docs/architecture/implementation-plan.md:353`, `:787`, `:817`, `:1115`
- Vấn đề: Plan nói nếu cold start của quiz generation chậm thì hãy warm trước demo bằng cách "ping the URL", "hitting any API route", hoặc `curl` tới `/api/quizzes/{token}`. Nhưng generation thật lại nằm ở `POST /api/quizzes`. Endpoint GET `/api/quizzes/{token}` không đi qua OpenAI/tiktoken/generation pipeline.
- Tác động: Team có thể tưởng đã warm đường nóng quan trọng nhất, nhưng đến lúc demo bấm Generate vẫn chịu cold start thật.
- Khuyến nghị: Nếu còn live generation trong demo, warm đúng code path tạo quiz. Nếu không, thực tế hơn là pre-generate quiz demo từ trước và tránh phụ thuộc vào live generation trên sân khấu.
>Quyết đinh:  pre-generate quiz demo từ trước và tránh phụ thuộc vào live generation trên sân khấu

### 7. Low: Có dấu hiệu mojibake/encoding artifact trong tài liệu hiện tại, làm giảm độ tin cậy khi dùng làm prompt cho AI

- Evidence: `docs/architecture/implementation-plan.md:1`, `:9`, `:17`, `:34`, `:59`, `:87`
- Vấn đề: Trong môi trường hiện tại, nhiều ký tự như mũi tên/dấu gạch dài hiển thị thành `窶・`, `竊・`, `竕･`...
- Tác động: Không phá hỏng hoàn toàn nội dung, nhưng làm giảm khả năng copy/paste chính xác vào prompt AI hoặc khi chia sẻ chéo công cụ.
- Khuyến nghị: Kiểm tra lại encoding/rendering pipeline và ưu tiên chuẩn hóa về UTF-8 hiển thị sạch trước khi dùng document làm "execution contract" cho AI coding assistants.
> Quyết định: Kiểm tra lại encoding/rendering pipeline và ưu tiên chuẩn hóa về UTF-8 hiển thị sạch trước khi dùng document làm "execution contract" cho AI coding assistants.

## Open Questions

- Quiz generation có bắt buộc phải tạo đủ đúng `questionCount` trước khi publish, hay team chấp nhận publish quiz thiếu câu?
> tạo ra gấp đôi số questionCount và lưu vào trong DB để phụ vụ cho client lấy về và randome sau này. 
- Dashboard có muốn phân biệt rõ `0% correct` với `chưa có dữ liệu` không?
> có
- API `GET /api/quizzes/[token]` có thật sự cần trong MVP, hay chỉ là artifact từ technical design?
> thực sự cần. tôi sẽ cung cấp AI API KEY sau. 
- Preview environment có cần seeded data không, hay chỉ cần local + production demo data?
> chỉ cần local + production demo data

## Suggested Revision Priorities

1. Sửa mâu thuẫn ở Phase 3/4/5 quanh `questionCount` và partial generation.
2. Sửa công thức `questionAccuracy` để không đánh đồng `no data` với `0%`.
3. Dọn lại Phase 0 và Phase 1 để deliverable/acceptance khớp với task thực thi.
4. Loại bỏ hoặc defer những task trùng lặp không cần cho MVP, đặc biệt API randomized quiz.
5. Chỉnh lại chiến lược warm-up/demo để bám đúng code path quan trọng.

## Positive Notes

- Phần chia phase và acceptance criteria rất thực dụng, phù hợp nhịp triển khai hackathon.
- Guidance cho AI-assisted coding có giá trị cao, đặc biệt các pattern prompt và rule chống scope creep.
- Tài liệu giữ được tư duy "ship vertical slice trước", đây là hướng đúng cho bài toán này.
