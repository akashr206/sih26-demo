import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Loader2, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FileUpload({ onUploadFile }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingText, setLoadingText] = useState('Analyzing...');

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  const handleUpload = async (e) => {
    e.stopPropagation();
    if (!file) return;
    
    setIsUploading(true);
    
    const stages = ['Extracting Text...', 'Analyzing Entities...', 'Generating Graph...', 'Writing Narrative...'];
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % stages.length;
      setLoadingText(stages[step]);
    }, 4000);
    
    try {
      await onUploadFile(file);
      setFile(null); // clear file on success
    } catch (err) {
      // error handled in page.jsx
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setLoadingText('Analyzing...');
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div className="absolute bottom-6 left-6 w-50 h-24 z-30">
      <div 
        {...getRootProps()} 
        className={`w-full h-full bg-surface-container-low/80 backdrop-blur-xl border border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group shadow-xl ${
          isDragActive ? 'border-primary bg-primary-container/10' : 'border-outline-variant hover:bg-surface-container-high'
        }`}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center w-full h-full"
            >
              <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center mb-1.5 group-hover:bg-primary-container/15 group-hover:text-primary transition-colors">
                <UploadCloud className="w-4 h-4 text-on-surface" />
              </div>
              <p className="font-body-sm text-[12px] font-medium text-on-surface mb-0.5 leading-tight">Drag &amp; drop raw police data</p>
              <p className="font-body-sm text-[10px] text-on-surface-variant">CSV, JSON, TXT, PDF up to 50MB</p>
            </motion.div>
          ) : (
            <motion.div
              key="file-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-between w-full h-full py-0.5"
            >
              <div className="flex items-center gap-2.5 w-full bg-surface-container-highest p-1.5 rounded-lg">
                <FileIcon className="w-4 h-4 text-secondary shrink-0" />
                <div className="flex-1 text-left overflow-hidden">
                  <p className="font-body-sm text-[11px] font-medium text-on-surface truncate">{file.name}</p>
                  <p className="font-label-caps text-[9px] text-on-surface-variant">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={clearFile}
                  className="p-1 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant hover:text-error flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-primary/20 text-primary py-1.5 rounded-lg font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingText}</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Extract &amp; Analyze</span>
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
