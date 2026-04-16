
import React, { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ExamDisplay } from './components/ExamDisplay';
import { Header } from './components/Header';
import { generateExam } from './services/geminiService';
import type { ExamData, ParsedTopic, SelectionOptions } from './types';
import { LoadingSpinner } from './components/LoadingSpinner';

function App() {
  const [selections, setSelections] = useState<Omit<SelectionOptions, 'referenceMaterial'>>({
    subject: 'Toán',
    grade: '1',
    bookSet: 'Kết nối tri thức với cuộc sống',
    examType: 'Đề kiểm tra Học kỳ I',
    questionCount: 10,
    pointsPerQuestion: 1.0,
  });
  const [parsedTopics, setParsedTopics] = useState<ParsedTopic[]>([]);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleGenerateExam = async () => {
    setIsLoading(true);
    setError(null);
    setExamData(null);

    // Build reference material from selected topics
    const referenceMaterial = parsedTopics
      .filter(topic => topic.selected)
      .map(topic => `Chủ đề: ${topic.title}\nNội dung:\n${topic.content}`)
      .join('\n\n---\n\n');

    const fullSelections: SelectionOptions = {
      ...selections,
      referenceMaterial,
    };

    try {
      const data = await generateExam(fullSelections);
      setExamData(data);
    } catch (err) {
      setError('Đã xảy ra lỗi khi tạo đề. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 xl:col-span-3">
            <ControlPanel
              selections={selections}
              setSelections={setSelections}
              onGenerate={handleGenerateExam}
              isLoading={isLoading}
              parsedTopics={parsedTopics}
              setParsedTopics={setParsedTopics}
            />
          </div>
          <div className="lg:col-span-8 xl:col-span-9">
            {isLoading ? (
              <div className="flex justify-center items-center h-full min-h-[500px] bg-white rounded-lg shadow-md">
                <LoadingSpinner />
              </div>
            ) : (
              <ExamDisplay examData={examData} error={error} selections={{...selections, referenceMaterial: ''}} />
            )}
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>Bản quyền © 2024 - Trình tạo đề kiểm tra Tiểu học</p>
      </footer>
    </div>
  );
}

export default App;
