
import React, { useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { ExamData, Question, SelectionOptions } from '../types';
import { MatrixModal } from './MatrixModal';

interface ExamDisplayProps {
  examData: ExamData | null;
  error: string | null;
  selections: SelectionOptions;
}

const QuestionRenderer: React.FC<{ q: Question; index: number }> = ({ q, index }) => {
    const questionNumber = index + 1;

    return (
        <div className="mt-4 break-inside-avoid">
            <p><strong>Câu {questionNumber} ({q.points} điểm):</strong> {q.question_text}</p>
            
            {q.type === 'Nối cột' && q.column_a && q.column_b && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 p-4 border-2 border-dashed rounded-lg bg-blue-50">
                    <div className="space-y-3">
                        {q.column_a.map((item, i) => (
                            <div key={`col-a-${i}`} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 min-h-[50px]">
                                <span className="flex-shrink-0 h-7 w-7 bg-indigo-100 text-indigo-800 rounded-full flex items-center justify-center font-bold text-sm">{i + 1}</span>
                                <span className="text-gray-800">{item}</span>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-3">
                        {q.column_b.map((item, i) => (
                            <div key={`col-b-${i}`} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border border-gray-200 min-h-[50px]">
                                <span className="flex-shrink-0 h-7 w-7 bg-pink-100 text-pink-800 rounded-full flex items-center justify-center font-bold text-sm">{String.fromCharCode(97 + i)}</span>
                                <span className="text-gray-800">{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {q.type === 'Điền khuyết' && q.options && q.options.length > 0 && (
                <div className="mt-2 border-2 border-dashed p-3 rounded-md bg-gray-50">
                    <p className="font-semibold text-center">{q.options.join('  •  ')}</p>
                </div>
            )}

            {(q.type === 'Nhiều lựa chọn' || q.type === 'Đúng – Sai') && q.options && (
                 <ul className="list-none pl-0 mt-2 flex flex-row flex-wrap gap-x-6 gap-y-1">
                    {q.options.map((opt, i) => <li key={i} className="font-bold">{opt}</li>)}
                </ul>
            )}
        </div>
    );
};

const ExportButtons: React.FC<{ onExportPDF: () => void; onExportWord: () => void; onShowMatrix: () => void; hasMatrix: boolean; }> = ({ onExportPDF, onExportWord, onShowMatrix, hasMatrix }) => (
    <div className="flex items-center space-x-3 print:hidden">
        <button
            onClick={onShowMatrix}
            disabled={!hasMatrix}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z" />
            </svg>
            Xem Ma trận
        </button>
        <button
            onClick={onExportPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Xuất PDF
        </button>
        <button
            onClick={onExportWord}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Xuất Word
        </button>
    </div>
);

const ExamPaper: React.FC<{ examData: ExamData }> = ({ examData }) => {
    const year = new Date().getFullYear();
    const schoolYear = `${year}-${year + 1}`;

    return (
        <div className="prose max-w-none prose-sm sm:prose-base">
            <div className="exam-page p-2">
                <header className="text-sm">
                    <div className="grid grid-cols-2 text-center font-bold">
                        <div>
                            <p className="uppercase">UBND XÃ ............</p>
                            <p className="uppercase">TRƯỜNG ..............</p>
                        </div>
                        <div>
                            <p className="uppercase">{examData.title}</p>
                            <p className="uppercase">NĂM HỌC {schoolYear}</p>
                        </div>
                    </div>
                     <div className="text-center font-bold mt-4">
                        <p className="uppercase">MÔN: {examData.subject} - LỚP {examData.grade}</p>
                        <p>Thời gian làm bài: {examData.duration} phút (không kể thời gian phát đề)</p>
                    </div>
                </header>

                <section className="mt-4 text-sm">
                     <div className="flex justify-between font-bold">
                        <span>Họ và tên: ....................................................</span>
                        <span>Lớp: .........................</span>
                    </div>
                     <table className="w-full border-collapse border border-black mt-2 text-center">
                        <thead>
                            <tr className="font-bold">
                                <td width="20%" className="border border-black p-1">Điểm</td>
                                <td width="30%" className="border border-black p-1">Nhận xét của GV</td>
                                <td width="25%" className="border border-black p-1">Giáo viên coi</td>
                                <td width="25%" className="border border-black p-1">Giáo viên chấm</td>
                            </tr>
                        </thead>
                        <tbody>
                             <tr>
                                <td className="border border-black h-20 align-top p-1">Bằng số:............<br/>Bằng chữ:...........</td>
                                <td className="border border-black h-20"></td>
                                <td className="border border-black h-20 align-top p-1">1..........................</td>
                                <td className="border border-black h-20 align-top p-1">1..........................</td>
                            </tr>
                        </tbody>
                    </table>
                </section>
                
                <section className="mt-6">
                    <h3 className="font-bold uppercase">I. PHẦN TRẮC NGHIỆM ({examData.multiple_choice_total_points} điểm)</h3>
                    {examData.multiple_choice_questions.map((q, index) => (
                       <QuestionRenderer key={`mc-${index}`} q={q} index={index} />
                    ))}
                </section>

                <section className="mt-6">
                    <h3 className="font-bold uppercase">II. PHẦN TỰ LUẬN ({examData.essay_total_points} điểm)</h3>
                    {examData.essay_questions.map((q, index) => (
                        <QuestionRenderer key={`essay-${index}`} q={q} index={examData.multiple_choice_questions.length + index} />
                    ))}
                </section>
            </div>
        </div>
    );
};

const AnswerKeySheet: React.FC<{ examData: ExamData }> = ({ examData }) => {
    const sortedAnswers = [...examData.answer_key].sort((a, b) => a.question_number - b.question_number);
    const mcAnswers = sortedAnswers.filter(a => a.question_number <= examData.multiple_choice_questions.length);
    const essayAnswers = sortedAnswers.filter(a => a.question_number > examData.multiple_choice_questions.length);

    return (
        <div className="prose max-w-none prose-sm sm:prose-base">
            <div className="exam-page p-2">
                 <header className="text-center font-bold text-sm">
                    <p className="uppercase">ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</p>
                    <p className="uppercase">{examData.title}</p>
                    <p className="uppercase">MÔN: {examData.subject} - LỚP {examData.grade}</p>
                </header>
                <section className="mt-6">
                     <h3 className="font-bold uppercase">I. PHẦN TRẮC NGHIỆM ({examData.multiple_choice_total_points} điểm)</h3>
                     <p>Mỗi câu trả lời đúng được {mcAnswers.length > 0 ? mcAnswers[0].points : '...'} điểm.</p>
                     <table className="w-full border-collapse border border-black mt-2 text-center text-sm">
                        <thead className="font-bold bg-gray-100">
                            <tr>
                                {mcAnswers.slice(0, 10).map(ans => <td key={`h-${ans.question_number}`} className="border border-black p-1">Câu {ans.question_number}</td>)}
                            </tr>
                        </thead>
                        <tbody>
                             <tr>
                               {mcAnswers.slice(0, 10).map(ans => <td key={`b-${ans.question_number}`} className="border border-black p-1 font-bold">{ans.correct_answer}</td>)}
                            </tr>
                        </tbody>
                    </table>
                </section>
                 <section className="mt-6">
                     <h3 className="font-bold uppercase">II. PHẦN TỰ LUẬN ({examData.essay_total_points} điểm)</h3>
                     {essayAnswers.map(ans => (
                         <div key={ans.question_number} className="mt-2 text-sm">
                             <p><strong>Câu {ans.question_number} ({ans.points} điểm):</strong></p>
                             <div className="whitespace-pre-wrap pl-4">{ans.explanation}</div>
                         </div>
                     ))}
                     <p className="mt-4 text-sm italic font-bold">(Có thể giải bằng cách khác nếu đúng vẫn được tính điểm)</p>
                 </section>
            </div>
        </div>
    );
};

export const ExamDisplay: React.FC<ExamDisplayProps> = ({ examData, error, selections }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'exam' | 'answers'>('exam');

    const exportPDF = () => {
        const input = contentRef.current;
        if (!input) return;

        html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            const ratio = canvasWidth / pdfWidth;
            const finalHeight = canvasHeight / ratio;

            if (finalHeight < pdfHeight) {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight);
            } else {
                let position = 0;
                while (position < canvasHeight) {
                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = canvasWidth;
                    pageCanvas.height = pdfHeight * ratio;
                    const pageCtx = pageCanvas.getContext('2d');
                    pageCtx?.drawImage(canvas, 0, position, canvasWidth, pdfHeight * ratio, 0, 0, canvasWidth, pdfHeight * ratio);
                    const pageImgData = pageCanvas.toDataURL('image/png');
                    if (position > 0) pdf.addPage();
                    pdf.addImage(pageImgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    position += pdfHeight * ratio;
                }
            }

            const fileName = activeTab === 'exam' ? `DeKiemTra` : `DapAn`;
            pdf.save(`${fileName}_${selections.subject}_Lop${selections.grade}.pdf`);
        });
    };

    const exportWord = () => {
        const node = contentRef.current;
        if (!node) return;

        let styles = '';
        Array.from(document.styleSheets).forEach(sheet => {
            try {
                if (sheet.cssRules) {
                    Array.from(sheet.cssRules).forEach(rule => {
                        styles += rule.cssText;
                    });
                }
            } catch (e) {
                console.warn("Could not read CSS rules from stylesheet:", sheet.href, e);
            }
        });

        const header = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                  xmlns:w='urn:schemas-microsoft-com:office:word' 
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Export HTML to Word Document</title>
                <style>
                    ${styles}
                    @page {
                        size: A4;
                        margin: 2cm;
                    }
                    body {
                        font-family: 'Times New Roman', serif;
                    }
                    .exam-page { 
                        width: 100%;
                    }
                    table, th, td {
                        border: 1px solid black !important;
                        border-collapse: collapse !important;
                        padding: 4px !important;
                    }
                </style>
            </head>
            <body>`;
        
        const styledContent = `<div>${node.innerHTML}</div>`;
        const footer = "</body></html>";
        const sourceHTML = header + styledContent + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        const fileName = activeTab === 'exam' ? `DeKiemTra` : `DapAn`;
        fileDownload.download = `${fileName}_${selections.subject}_Lop${selections.grade}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    if (error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-red-600 min-h-[500px] flex flex-col justify-center items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold">Lỗi!</p>
                <p>{error}</p>
            </div>
        );
    }
    
    if (!examData) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-500 min-h-[500px] flex flex-col justify-center items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-800">Sẵn sàng tạo đề kiểm tra</h3>
                <p className="mt-1">Vui lòng chọn các tùy chọn ở bên trái và nhấn "Tạo đề kiểm tra" để bắt đầu.</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="bg-white p-6 md:p-8 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-6 print:hidden">
                    <h2 className="text-xl font-bold text-gray-800">
                        {activeTab === 'exam' ? 'Nội dung đề kiểm tra' : 'Đáp án và Hướng dẫn chấm'}
                    </h2>
                    <ExportButtons 
                        onExportPDF={exportPDF} 
                        onExportWord={exportWord} 
                        onShowMatrix={() => setIsModalOpen(true)}
                        hasMatrix={!!examData.exam_matrix && !!examData.specification_table}
                    />
                </div>
                
                <div className="border-b border-gray-200 print:hidden">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('exam')}
                            className={`${activeTab === 'exam' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Đề kiểm tra
                        </button>
                        <button
                            onClick={() => setActiveTab('answers')}
                            className={`${activeTab === 'answers' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Đáp án & Hướng dẫn chấm
                        </button>
                    </nav>
                </div>

                <div className="mt-6" ref={contentRef}>
                    {activeTab === 'exam' && <ExamPaper examData={examData} />}
                    {activeTab === 'answers' && <AnswerKeySheet examData={examData} />}
                </div>
            </div>
            <MatrixModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                matrixHtml={examData.exam_matrix}
                specHtml={examData.specification_table}
            />
        </>
    );
};
