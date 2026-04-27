import React, { useState } from 'react';
import { uploadCSV } from '../services/api';
import useStore from '../store/useStore';
import { Upload, FileSpreadsheet, CheckCircle2, Loader2 } from 'lucide-react';

const UploadCSV = () => {
  const store = useStore();
  const { setDataset, setChartConfig, setLoading, setError, isLoading, uploadProgress, totalRows, fileSizeMb } = store;
  const [fileName, setFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    const allowed = ['.csv', '.data', '.txt'];
    if (!file || !allowed.some(ext => file.name.endsWith(ext))) {
      setError('Please upload a valid CSV, DATA, or TXT file.');
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setError(null);
    store.setUploadProgress(0);

    try {
      await uploadCSV(file, (pct) => store.setUploadProgress(pct));
    } catch (err) {
      setError(err?.message || err.response?.data?.detail || 'System error during CSV processing.');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  return (
    <div className="upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div className={`upload-zone ${isDragging ? 'dragging' : ''} ${fileName ? 'has-file' : ''}`}
           onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
           onDragLeave={() => setIsDragging(false)}
           onDrop={onDrop}>
        
        <label className="upload-label">
          <div className="icon-wrapper">
            {isLoading ? <Loader2 className="animate-spin" /> : 
             fileName ? <CheckCircle2 className="icon-success" /> : 
             <FileSpreadsheet />}
          </div>
          
          <div className="text-wrapper">
            <p className="main-text">
              {isLoading ? 'Processing Pipeline...' : 
               fileName ? fileName : 'Upload Dataset'}
            </p>
            <p className="sub-text">
              {fileName ? 'Ready for visualization' : 'Drag & drop or click to browse'}
            </p>
          </div>

          <input 
            type="file" 
            accept=".csv,.data,.txt" 
            onChange={(e) => processFile(e.target.files[0])} 
            style={{ display: 'none' }}
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading && (
        <div className="upload-progress-container" style={{ padding: '0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
            <span>{uploadProgress < 60 ? 'Parsing CSV locally...' : 'Computing aggregations...'}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              background: '#2563eb', 
              width: `${uploadProgress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          {fileSizeMb > 2 && (
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
              {fileSizeMb} MB file — optimizing {totalRows?.toLocaleString()} rows for R&D evaluation
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadCSV;
