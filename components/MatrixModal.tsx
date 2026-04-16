import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface MatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  matrixHtml?: string;
  specHtml?: string;
}

export const MatrixModal: React.FC<MatrixModalProps> = ({ isOpen, onClose, matrixHtml, specHtml }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'spec'>('matrix');
  const contentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) {
    return null;
  }
  
  const getActiveHtml = () => {
      return activeTab === 'matrix' ? matrixHtml : specHtml;
  }
  
  const getFileName = () => {
      return activeTab === 'matrix' ? 'Ma_tran_de' : 'Bang_dac_ta';
  }

  const handleExportWord = () => {
    const htmlContent = getActiveHtml();
    if (!htmlContent) return;

    let allStyles = '';
    Array.from(document.styleSheets).forEach(sheet => {
        try {
            if (sheet.cssRules) {
                Array.from(sheet.cssRules).forEach(rule => {
                    allStyles += rule.cssText;
                });
            }
        } catch (e) {
            console.warn("Could not read CSS rules from stylesheet:", sheet.href, e);
        }
    });

    const styles = `
    <style>
      ${allStyles}
      @page {
          size: A4 landscape;
          margin: 1.5cm;
      }
      body {
        font-family: 'Times New Roman', serif;
        font-size: 10pt;
      }
      table, th, td {
        border: 1px solid black !important;
        border-collapse: collapse !important;
        padding: 4px !important;
      }
      th {
        background-color: #f2f2f2 !important;
        font-weight: bold;
      }
      .prose {
          max-width: none !important;
      }
    </style>
    `;

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' "+
        "xmlns:w='urn:schemas-microsoft-com:office:word' "+
        "xmlns='http://www.w3.org/TR/REC-html40'>"+
        `<head><meta charset='utf-8'><title>Export HTML to Word Document</title>${styles}</head><body>`;
    
    const styledContent = `<div class="prose max-w-none">${htmlContent}</div>`;
    const footer = "</body></html>";
    const sourceHTML = header + styledContent + footer;

    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${getFileName()}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleExportExcel = () => {
    const htmlContent = getActiveHtml();
    if (!htmlContent) return;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const table = tempDiv.querySelector('table');
    if (!table) {
        alert("Không tìm thấy bảng để xuất.");
        return;
    }

    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet 1" });
    XLSX.writeFile(wb, `${getFileName()}.xlsx`);
  };

  const handleExportPDF = () => {
    const input = contentRef.current?.querySelector('.table-container');
    if (!input) return;

    html2canvas(input as HTMLElement, { scale: 2 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        // Use landscape for wide tables
        const pdf = new jsPDF('l', 'mm', 'a4'); 
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        
        // Center the image
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;
        
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        pdf.save(`${getFileName()}.pdf`);
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b gap-4">
          <h2 className="text-xl font-semibold text-gray-800 flex-shrink-0">Ma trận và Bảng đặc tả</h2>
          
          <div className="flex items-center space-x-2 flex-wrap">
             <button onClick={handleExportExcel} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Excel
             </button>
             <button onClick={handleExportWord} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Word
             </button>
             <button onClick={handleExportPDF} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                PDF
             </button>
          </div>

          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
        </div>
        
        <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6 p-4" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab('matrix')}
                    className={`${activeTab === 'matrix' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                    Ma trận đề
                </button>
                <button
                    onClick={() => setActiveTab('spec')}
                    className={`${activeTab === 'spec' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
                >
                    Bảng đặc tả
                </button>
            </nav>
        </div>
        
        <div className="p-2 sm:p-6 overflow-auto" ref={contentRef}>
            <div className="table-container">
                {activeTab === 'matrix' && matrixHtml && (
                    <div className="prose max-w-none [&_table]:w-full [&_table]:text-xs [&_table]:sm:text-sm [&_table]:border [&_table]:border-collapse [&_th]:border [&_th]:p-1 [&_th]:sm:p-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_td]:border [&_td]:p-1 [&_td]:sm:p-2 [&_td]:text-center [&_th]:text-center" dangerouslySetInnerHTML={{ __html: matrixHtml }} />
                )}
                {activeTab === 'spec' && specHtml && (
                    <div className="prose max-w-none [&_table]:w-full [&_table]:text-xs [&_table]:sm:text-sm [&_table]:border [&_table]:border-collapse [&_th]:border [&_th]:p-1 [&_th]:sm:p-2 [&_th]:bg-gray-100 [&_th]:font-semibold [&_td]:border [&_td]:p-1 [&_td]:sm:p-2" dangerouslySetInnerHTML={{ __html: specHtml }} />
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
