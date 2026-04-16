
import { GoogleGenAI, Type } from "@google/genai";
import type { ExamData, SelectionOptions } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const generatePrompt = (options: SelectionOptions): string => {
  const totalPoints = options.questionCount * options.pointsPerQuestion;

  let structurePrompt = '';
  let structureRules = `
    2.  **Cấu trúc đề**:
        -   Tổng cộng ${options.questionCount} câu hỏi với tổng điểm là ${totalPoints}.
        -   **Phân bổ câu hỏi và điểm**: Phân bổ câu hỏi thành khoảng 70% trắc nghiệm và 30% tự luận. Quan trọng hơn, phân bổ tổng điểm thành 70% cho phần trắc nghiệm và 30% cho phần tự luận (ví dụ: nếu tổng 10 điểm, trắc nghiệm 7 điểm, tự luận 3 điểm). Mỗi câu hỏi phải có điểm riêng (ví dụ: 0.5, 1, 1.5, 2 điểm) và tổng điểm của tất cả các câu hỏi phải chính xác bằng ${totalPoints}.
        -   **Phần Trắc nghiệm**: Đa dạng các dạng câu hỏi: Nhiều lựa chọn, Đúng – Sai, Nối cột, Điền khuyết.
        -   **Phân bố mức độ nhận thức**: Mức 1 (Nhận biết): 50%, Mức 2 (Thông hiểu): 30%, Mức 3 (Vận dụng): 20%.`;

  if (options.referenceMaterial) {
    structurePrompt = `
    **QUY TẮC QUAN TRỌNG VỀ CẤU TRÚC ĐỀ**:
    Tài liệu tham khảo đính kèm là một đề thi mẫu. Yêu cầu BẮT BUỘC phải tuân thủ nghiêm ngặt cấu trúc của đề thi mẫu này, bao gồm:
    1.  **Số lượng câu hỏi**: Tạo ra chính xác số lượng câu hỏi trắc nghiệm và tự luận như trong tài liệu.
    2.  **Điểm số cho mỗi câu**: Phân bổ điểm cho từng câu hỏi y hệt như trong tài liệu.
    3.  **Tổng điểm**: Tổng điểm của đề thi mới phải bằng tổng điểm của đề thi trong tài liệu.
    
    Các thông số về "Số câu hỏi" và "Điểm/câu" được cung cấp bên dưới chỉ là giá trị tham khảo. Hãy BỎ QUA chúng và ưu tiên tuyệt đối cấu trúc từ tài liệu tham khảo. Nội dung câu hỏi mới có thể khác, nhưng cấu trúc phải được giữ nguyên.
    `;
    structureRules = `
    2.  **Cấu trúc đề**:
        -   **Phân bổ câu hỏi và điểm**: Dựa hoàn toàn vào cấu trúc (số câu, điểm mỗi câu, tổng điểm) của tài liệu tham khảo.
        -   **Phần Trắc nghiệm**: Đa dạng các dạng câu hỏi: Nhiều lựa chọn, Đúng – Sai, Nối cột, Điền khuyết.
        -   **Phân bố mức độ nhận thức**: Mức 1 (Nhận biết): 50%, Mức 2 (Thông hiểu): 30%, Mức 3 (Vận dụng): 20%.`;
  }
  
  const referenceMaterialPrompt = options.referenceMaterial
    ? `
    **TÀI LIỆU THAM KHẢO (ĐỀ THI MẪU)**:
    ---
    ${options.referenceMaterial}
    ---
    `
    : '';

  return `
    Là một chuyên gia công nghệ giáo dục Việt Nam, hãy tạo một đề kiểm tra định kỳ cho học sinh Tiểu học dựa trên các thông tin sau:
    - Môn học: ${options.subject}
    - Lớp: ${options.grade}
    - Bộ sách: ${options.bookSet}
    - Loại đề: ${options.examType}
    - Thời gian làm bài: 35 phút
    - Tổng số câu hỏi (tham khảo): ${options.questionCount}
    - Tổng điểm (tham khảo): ${totalPoints} điểm.

    ${structurePrompt}
    ${referenceMaterialPrompt}

    Yêu cầu tuân thủ nghiêm ngặt các quy định sau:
    1.  **Căn cứ pháp lý**: Bám sát Chương trình Giáo dục phổ thông 2018 ban hành kèm theo **Thông tư 32/2018/TT-BGDĐT** và quy định đánh giá tại Thông tư 27/2020/TT-BGDĐT.
${structureRules}
    3.  **Nội dung câu hỏi**:
        -   Nội dung 'question_text' KHÔNG được chứa số thứ tự câu hoặc điểm số.
        -   Với câu hỏi 'Nhiều lựa chọn', các phương án trả lời trong mảng 'options' PHẢI có đúng 4 phương án và bắt đầu bằng 'A. ', 'B. ', 'C. ', 'D. '.
        -   Với câu hỏi 'Đúng – Sai', các phương án trả lời trong mảng 'options' phải là 'A. Đúng', 'B. Sai'.
    4.  **Đáp án và Hướng dẫn chấm**:
        -   Đối với câu hỏi trắc nghiệm, 'correct_answer' PHẢI chỉ là chữ cái của đáp án đúng (ví dụ: 'A', 'B'), và 'explanation' có thể để trống hoặc giải thích ngắn gọn.
        -   Đối với câu hỏi tự luận, 'correct_answer' nên tóm tắt đáp án cuối cùng (ví dụ: '45 kg', '40 cm2'). Trường 'explanation' là quan trọng nhất và BẮT BUỘC phải:
            *   Cung cấp lời giải chi tiết, từng bước rõ ràng.
            *   Bao gồm thang điểm (barem) cụ thể cho từng bước hoặc từng ý nếu câu hỏi có nhiều phần (ví dụ: 'Lời giải: 0.25 điểm, Phép tính: 0.5 điểm, Đáp số: 0.25 điểm').
            *   Tổng điểm của thang điểm phải khớp chính xác với tổng điểm của câu hỏi đó. Điều này rất quan trọng để đảm bảo tính nhất quán với ma trận đề.
        -   Trường 'points' trong mỗi mục đáp án phải luôn khớp với điểm của câu hỏi tương ứng.
    
    5.  **Ma trận đề kiểm tra**: Bắt buộc tạo dưới dạng một chuỗi HTML chứa thẻ \`<table>\`. Bảng này phải có cấu trúc chi tiết như sau:
        -   **Tiêu đề chính**: MA TRẬN ĐỀ KIỂM TRA CUỐI HỌC KÌ I, MÔN [TÊN MÔN] LỚP [TÊN LỚP].
        -   **Hàng tiêu đề (thead)**: Phải có 3 hàng tiêu đề phức tạp sử dụng \`rowspan\` và \`colspan\`.
            -   Hàng 1: Các cột chính \`TT\`, \`Chương/Chủ đề\`, \`Nội dung/đơn vị kiến thức\`, \`Số tiết\`, \`Tỉ lệ\`, \`Số điểm cần đạt\`. Sau đó là một ô gộp \`Trắc nghiệm\` (colspan 12) và một ô \`Tự luận\` (colspan 3, rowspan 2). Cuối cùng là \`Tổng số câu/ý\` và \`Điểm từng bài\`.
            -   Hàng 2: Dưới ô \`Trắc nghiệm\` là các ô gộp cho từng loại: \`Nhiều lựa chọn\` (colspan 3), \`Đúng-Sai\` (colspan 3), \`Nối cột\` (colspan 3), \`Điền khuyết\` (colspan 3).
            -   Hàng 3: Dưới mỗi loại câu hỏi là 3 cột: \`Biết\`, \`Hiểu\`, \`VD\` (Vận dụng). Dưới \`Tự luận\` cũng là 3 cột \`Biết\`, \`Hiểu\`, \`VD\`.
        -   **Phần thân (tbody)**: Mỗi hàng tương ứng với một đơn vị kiến thức (bài học). Điền số lượng câu hỏi (ví dụ: '1') vào các ô \`Biết\`, \`Hiểu\`, \`VD\` tương ứng với loại câu hỏi. Sử dụng \`rowspan\` cho cột \`Chương/Chủ đề\` nếu nhiều bài học thuộc cùng một chủ đề.
        -   **Phần chân (tfoot)**: Chứa các hàng tổng kết: \`Tổng số câu\`, \`Điểm từng mức độ\`, \`Tỉ lệ\`.

    6.  **Bảng đặc tả**: Bắt buộc tạo dưới dạng một chuỗi HTML chứa thẻ \`<table>\`. Bảng này phải có cấu trúc chi tiết như sau:
        -   **Tiêu đề chính**: BẢN ĐẶC TẢ ĐỀ KIỂM TRA CUỐI NĂM HỌC, MÔN [TÊN MÔN] LỚP [TÊN LỚP].
        -   **Hàng tiêu đề (thead)**:
            -   Cột \`TT\`, \`Chương/chủ đề\`, \`Nội dung/đơn vị kiến thức\`, \`Yêu cầu cần đạt\`.
            -   Sau đó là các cột gộp cho các loại câu hỏi và mức độ nhận thức. Ví dụ: một ô gộp \`TNKQ\` (Trắc nghiệm khách quan) và một ô gộp \`Tự luận\`. Dưới \`TNKQ\` là các ô gộp \`Nhiều lựa chọn\`, \`Đúng-Sai\`, v.v., và dưới mỗi loại đó là các cột \`Biết\`, \`Hiểu\`, \`VD\`.
        -   **Phần thân (tbody)**: Mỗi hàng tương ứng với một đơn vị kiến thức/yêu cầu cần đạt. Điền số lượng câu hỏi (thường là '1') vào ô tương ứng với loại câu hỏi và mức độ nhận thức của nó.
        -   **Phần chân (tfoot)**: Chứa các hàng tổng kết: \`Tổng số câu\`, \`Tổng số điểm\`, \`Tỉ lệ %\`.

    7.  **Đầu ra**: Trả về một đối tượng JSON hoàn chỉnh.
  `;
};

const questionSchema = {
    type: Type.OBJECT,
    properties: {
        question_text: { type: Type.STRING, description: "Nội dung câu hỏi, không bao gồm số thứ tự hay điểm." },
        options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các lựa chọn trả lời (ví dụ: ['A. Táo', 'B. Cam']) hoặc kho từ cho 'Điền khuyết'" },
        column_a: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nội dung cột A cho câu hỏi 'Nối cột'" },
        column_b: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Nội dung cột B cho câu hỏi 'Nối cột'" },
        type: { type: Type.STRING, description: "Loại câu hỏi (Nhiều lựa chọn, Đúng – Sai, Nối cột, Điền khuyết, Tự luận)" },
        level: { type: Type.INTEGER, description: "Mức độ nhận thức (1, 2, hoặc 3)" },
        points: { type: Type.NUMBER, description: "Điểm cho câu hỏi này."}
    },
    required: ["question_text", "type", "level", "points"]
};

const schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Tiêu đề của bài kiểm tra, ví dụ: 'ĐỀ KIỂM TRA CUỐI HỌC KỲ I'" },
    subject: { type: Type.STRING, description: "Tên môn học" },
    grade: { type: Type.STRING, description: "Lớp học, ví dụ '1'" },
    duration: { type: Type.INTEGER, description: "Thời gian làm bài (tính bằng phút). Bắt buộc phải là 35." },
    multiple_choice_total_points: { type: Type.NUMBER, description: "Tổng số điểm cho phần trắc nghiệm." },
    essay_total_points: { type: Type.NUMBER, description: "Tổng số điểm cho phần tự luận." },
    multiple_choice_questions: {
      type: Type.ARRAY,
      description: "Danh sách các câu hỏi trắc nghiệm",
      items: questionSchema,
    },
    essay_questions: {
      type: Type.ARRAY,
      description: "Danh sách các câu hỏi tự luận",
      items: {
          ...questionSchema,
          properties: { ...questionSchema.properties, type: { type: Type.STRING, description: "Luôn là 'Tự luận'" } }
      }
    },
    answer_key: {
      type: Type.ARRAY,
      description: "Đáp án và hướng dẫn chấm cho tất cả các câu hỏi",
      items: {
        type: Type.OBJECT,
        properties: {
          question_number: { type: Type.INTEGER, description: "Số thứ tự câu hỏi" },
          correct_answer: { type: Type.STRING, description: "Đáp án đúng (chỉ là chữ cái A, B, C... cho trắc nghiệm)" },
          explanation: { type: Type.STRING, description: "Hướng dẫn chấm hoặc giải thích chi tiết" },
          points: { type: Type.NUMBER, description: "Điểm của câu trả lời, phải khớp với điểm của câu hỏi" }
        },
        required: ["question_number", "correct_answer", "explanation", "points"]
      },
    },
    exam_matrix: { type: Type.STRING, description: "Ma trận đề kiểm tra dưới dạng một chuỗi HTML chứa thẻ <table> có cấu trúc phức tạp theo yêu cầu." },
    specification_table: { type: Type.STRING, description: "Bảng đặc tả câu hỏi chi tiết bám sát Thông tư 32, dưới dạng một chuỗi HTML chứa thẻ <table> có cấu trúc phức tạp theo yêu cầu." }
  },
  required: ["title", "subject", "grade", "duration", "multiple_choice_total_points", "essay_total_points", "multiple_choice_questions", "essay_questions", "answer_key", "exam_matrix", "specification_table"]
};

export const generateExam = async (options: SelectionOptions): Promise<ExamData> => {
  const prompt = generatePrompt(options);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const jsonText = response.text.trim();
    const data = JSON.parse(jsonText);

    if (!data.multiple_choice_questions || !data.essay_questions || !data.answer_key || !data.exam_matrix || !data.specification_table) {
        throw new Error("Invalid data structure received from API");
    }

    return data as ExamData;

  } catch (error) {
    console.error("Error generating exam with Gemini:", error);
    throw new Error("Failed to generate exam content.");
  }
};
