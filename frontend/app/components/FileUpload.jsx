import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X, Loader2, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FileUpload({ onUploadFile }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

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
    
    try {
      await onUploadFile(file);
      setFile(null); // clear file on success
    } catch (err) {
      // error handled in page.jsx
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
  };

  return (
    <div className="absolute bottom-6 left-6 w-64 z-30">
      <div 
        {...getRootProps()} 
        className={`bg-surface-container-low/80 backdrop-blur-xl border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group ${
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
              className="flex flex-col items-center w-full"
            >
              <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center mb-2 group-hover:bg-primary-container/15 group-hover:text-primary transition-colors">
                <UploadCloud className="w-6 h-6 text-on-surface" />
              </div>
              <p className="font-body-sm text-[13px] font-medium text-on-surface mb-1 leading-tight">Drag &amp; drop raw police data</p>
              <p className="font-body-sm text-[11px] text-on-surface-variant">CSV, JSON, TXT, PDF up to 50MB</p>
            </motion.div>
          ) : (
            <motion.div
              key="file-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full"
            >
              <div className="flex items-center gap-3 w-full bg-surface-container-highest p-2 rounded-lg mb-3">
                <FileIcon className="w-5 h-5 text-secondary" />
                <div className="flex-1 text-left overflow-hidden">
                  <p className="font-body-sm text-[12px] font-medium text-on-surface truncate">{file.name}</p>
                  <p className="font-label-caps text-[9px] text-on-surface-variant">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  onClick={clearFile}
                  className="p-1 hover:bg-surface-variant rounded-full transition-colors text-on-surface-variant hover:text-error flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-primary/20 text-primary py-1.5 rounded font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5" />
                    <span>Extract & Analyze</span>
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
