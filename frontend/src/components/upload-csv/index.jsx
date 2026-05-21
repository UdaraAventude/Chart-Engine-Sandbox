import React, { useState } from 'react';
import { uploadCSV } from '../../services/api';
import useStore from '../../store';
import { Upload, FileSpreadsheet, CheckCircle2, Loader2 } from 'lucide-react';
import './UploadCSV.css';

const UploadCSV = () => {
  const { setLoading, setError, isLoading, uploadProgress, totalRows } =
    useStore();
  const store = useStore();
  const [fileName, setFileName] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file) => {
    const allowed = ['.csv', '.data', '.txt'];
    if (!file || !allowed.some((ext) => file.name.endsWith(ext))) {
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
      setError(
        err?.message ||
          err?.body?.error ||
          err?.body?.detail ||
          'System error during CSV processing.',
      );
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
    <div className='upload-wrapper'>
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${fileName ? 'has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <label className='upload-label'>
          <div className='icon-wrapper'>
            {isLoading ? (
              <Loader2 className='animate-spin' />
            ) : fileName ? (
              <CheckCircle2 className='icon-success' />
            ) : (
              <FileSpreadsheet />
            )}
          </div>

          <div className='text-wrapper'>
            <p className='main-text'>
              {isLoading
                ? 'Processing Pipeline...'
                : fileName
                  ? fileName
                  : 'Upload Dataset'}
            </p>
            <p className='sub-text'>
              {fileName
                ? 'Ready for visualization'
                : 'Drag & drop or click to browse'}
            </p>
          </div>

          <input
            type='file'
            accept='.csv,.data,.txt'
            onChange={(e) => processFile(e.target.files[0])}
            className='upload-file-input'
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading && (
        <div className='upload-progress-container'>
          <div className='upload-progress-header'>
            <span>
              {uploadProgress < 30
                ? 'Uploading to server...'
                : 'Processing dataset on server...'}
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className='upload-progress-track'>
            <div
              className='upload-progress-fill'
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default UploadCSV;
