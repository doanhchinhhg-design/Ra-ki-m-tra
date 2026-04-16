import React, { useRef, useState } from 'react';
import type { SelectionOptions, ParsedTopic } from '../types';
import { SUBJECTS, GRADES, BOOK_SETS, EXAM_TYPES, POINTS_OPTIONS } from '../constants';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Required setup for pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

interface ControlPanelProps {
  selections: Omit<SelectionOptions, 'referenceMaterial'>;
  setSelections: React.Dispatch<React.SetStateAction<Omit<SelectionOptions, 'referenceMaterial'>>>;
  onGenerate: () => void;
  isLoading: boolean;
  parsedTopics: ParsedTopic[];
  setParsedTopics: React.Dispatch<React.SetStateAction<ParsedTopic[]>>;
}

const SelectInput: React.FC<{ label: string; name: keyof SelectionOptions; value: string | number; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: (string | number)[]; id: string; }> = ({ label, name, value, onChange, options, id }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <select
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
        >
            {options.map((option) => (
                <option key={option} value={option}>{option}</option>
            ))}
        </select>
    </div>
);

const NumberInput: React.FC<{ label: string; name: keyof SelectionOptions; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; id: string; }> = ({ label, name, value, onChange, id }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <input
            type="number"
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            min="1"
            max="50"
            className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
        />
    </div>
);


const parseTextToTopics = (text: string): ParsedTopic[] => {
    // Improved Regex to find more header formats: Bài, Chương, Phần, Chủ đề, Tuần, Tiết
    const headerRegex = /^(Bài\s+\d+|Chương\s+\d+|Phần\s+[A-Z\d]+|Chủ đề\s*[\d\w]*|Tuần\s+\d+|Tiết\s+\d+)[:.\s-]\s*(.*)$/gim;
    const topics: ParsedTopic[] = [];
    
    const splits = text.split(headerRegex);
    if (splits.length <= 1) { // No headers found
        return [{ title: 'Toàn bộ tài liệu', content: text, selected: true }];
    }

    // The regex split results in an array like: [before_first_match, match_group_1, match_group_2, between_matches, match_group_1, match_group_2, ...]
    for (let i = 1; i < splits.length; i += 3) {
        const title = `${splits[i].trim()} ${splits[i+1].trim()}`;
        const content = splits[i+2] ? splits[i+2].trim() : '';
        if (title && content) {
            topics.push({ title, content, selected: true }); // Default to selected
        }
    }
    return topics;
};

// Helper to filter topics based on the selected exam type (mid-term 1, mid-term 2, etc.)
const filterTopicsForExamType = (topics: ParsedTopic[], examType: string): ParsedTopic[] => {
  const getWeekNumber = (title: string): number | null => {
    const match = title.match(/Tuần\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  };

  switch (examType) {
    case 'Đề kiểm tra Giữa kỳ I':
      return topics.map(topic => {
        const week = getWeekNumber(topic.title);
        return { ...topic, selected: week !== null && week >= 1 && week <= 11 };
      });
    case 'Đề kiểm tra Giữa kỳ II':
      return topics.map(topic => {
        const week = getWeekNumber(topic.title);
        return { ...topic, selected: week !== null && week >= 19 && week <= 28 };
      });
    default:
      // For any other exam type, select all topics.
      return topics.map(topic => ({ ...topic, selected: true }));
  }
};


export const ControlPanel: React.FC<ControlPanelProps> = ({ selections, setSelections, onGenerate, isLoading, parsedTopics, setParsedTopics }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    const isNumericField = name === 'questionCount' || name === 'pointsPerQuestion';
    
    if (name === 'examType') {
        setSelections(prev => ({ ...prev, examType: value }));
        if (parsedTopics.length > 0) {
            setParsedTopics(filterTopicsForExamType(parsedTopics, value));
        }
    } else {
        setSelections(prev => ({ 
            ...prev, 
            [name]: isNumericField ? Number(value) : value 
        }));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParsedTopics([]);

    try {
        let text = '';
        const extension = file.name.split('.').pop()?.toLowerCase();
        
        if (extension === 'txt' || extension === 'md') {
            text = await file.text();
        } else if (extension === 'docx') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            text = result.value;
        } else if (extension === 'pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            const pageTexts = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
                pageTexts.push(pageText);
            }
            text = pageTexts.join('\n\n');
        } else if (['xls', 'xlsx'].includes(extension ?? '')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetTexts = [];
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const sheetText = XLSX.utils.sheet_to_txt(worksheet);
                sheetTexts.push(sheetText);
            }
            text = sheetTexts.join('\n\n---\n\n');
        } else {
            alert('Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .txt, .md, .docx, .pdf, .xlsx.');
        }
        
        if (text) {
            const topics = parseTextToTopics(text);
            setParsedTopics(filterTopicsForExamType(topics, selections.examType));
        }

    } catch (error) {
        console.error('Lỗi xử lý tệp:', error);
        alert('Đã xảy ra lỗi khi đọc nội dung tệp. Vui lòng thử lại.');
    } finally {
        setIsParsing(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const handleTopicSelectionChange = (index: number) => {
    const newTopics = [...parsedTopics];
    newTopics[index].selected = !newTopics[index].selected;
    setParsedTopics(newTopics);
  };
  
  const handleSelectAll = () => {
    setParsedTopics(prevTopics => prevTopics.map(t => ({ ...t, selected: true })));
  };

  const handleDeselectAll = () => {
    setParsedTopics(prevTopics => prevTopics.map(t => ({ ...t, selected: false })));
  };

  // Reusable Generate Button Component
  const GenerateButton = () => (
    <button
      onClick={onGenerate}
      disabled={isLoading || isParsing}
      className="mt-4 w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Đang tạo đề...
        </>
      ) : isParsing ? (
        <>
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Đang xử lý tệp...
        </>
      ) : (
        parsedTopics.length > 0 ? 'Tạo đề từ nội dung đã chọn' : 'Tạo đề kiểm tra'
      )}
    </button>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md sticky top-8">
      {/* Step 1 */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Bước 1: Tùy chọn đề</h2>
      <div className="space-y-4">
        {/* Basic Selections */}
        <SelectInput id="subject" name="subject" label="Chọn môn học" value={selections.subject} onChange={handleChange} options={SUBJECTS} />
        <SelectInput id="grade" name="grade" label="Chọn lớp" value={selections.grade} onChange={handleChange} options={GRADES} />
        <SelectInput id="bookSet" name="bookSet" label="Chọn bộ sách" value={selections.bookSet} onChange={handleChange} options={BOOK_SETS} />
        <SelectInput id="examType" name="examType" label="Chọn loại đề" value={selections.examType} onChange={handleChange} options={EXAM_TYPES} />
        
        {/* Question Count & Points */}
        <div className="grid grid-cols-2 gap-4">
          <NumberInput id="questionCount" name="questionCount" label="Số câu" value={selections.questionCount} onChange={handleChange} />
          <SelectInput id="pointsPerQuestion" name="pointsPerQuestion" label="Điểm/câu" value={selections.pointsPerQuestion} onChange={handleChange} options={POINTS_OPTIONS} />
        </div>
        
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tài liệu tham khảo (Tùy chọn)
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Tải lên một tệp</span>
                  <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".txt,.md,.docx,.pdf,.xls,.xlsx" ref={fileInputRef}/>
                </label>
                <p className="pl-1">hoặc kéo và thả</p>
              </div>
              <p className="text-xs text-gray-500">Hỗ trợ .docx, .pdf, .xlsx, .txt, .md</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Step 2 - Conditional */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        {parsedTopics.length > 0 ? (
          <div>
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Bước 2: Chọn bài học</h2>
                <p className="text-sm text-gray-500">
                  Đã chọn {parsedTopics.filter(t => t.selected).length}/{parsedTopics.length} phần để tạo đề.
                </p>
              </div>
              <div className="flex-shrink-0 space-x-2">
                <button onClick={handleSelectAll} className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200 transition-colors">Chọn tất cả</button>
                <button onClick={handleDeselectAll} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">Bỏ chọn</button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border-gray-200 p-2 bg-gray-50">
              {parsedTopics.map((topic, index) => (
                <div
                  key={index}
                  onClick={() => handleTopicSelectionChange(index)}
                  className={`flex items-start p-3 rounded-md cursor-pointer transition-colors border shadow-sm ${
                    topic.selected
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <div className="flex items-center h-5 pt-0.5">
                    <input
                      id={`topic-${index}`}
                      name={`topic-${index}`}
                      type="checkbox"
                      checked={topic.selected}
                      readOnly
                      className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded pointer-events-none"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor={`topic-${index}`} className="font-medium text-gray-800 cursor-pointer">{topic.title}</label>
                    <p className="text-gray-500 text-xs mt-1">
                        {`${topic.content.substring(0, 120).replace(/\s+/g, ' ')}...`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <GenerateButton />
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Bước 2: Tạo đề</h2>
            <p className="text-sm text-gray-500 mb-3">Nhấn nút bên dưới để AI tự tạo đề dựa trên môn học và lớp đã chọn, hoặc tải lên tài liệu ở trên để tùy chỉnh nội dung.</p>
            <GenerateButton />
          </div>
        )}
      </div>
    </div>
  );
};