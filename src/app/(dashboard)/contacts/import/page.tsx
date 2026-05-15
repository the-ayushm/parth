'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, Upload, Download, FileText } from 'lucide-react';
import api from '@/lib/api';

export default function ImportContactsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [listName, setListName] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.xlsx') && !droppedFile.name.endsWith('.xls')) {
        setError('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    if (!listName) {
      setError('Please enter a list name');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('list_name', listName);

      const response = await api.post('/admin/contacts/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      // New async job queue response
      if (data.job_id) {
        // Store job ID in localStorage and redirect to contacts page
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeImportJob', data.job_id);
        }
        router.push('/contacts');
      } else {
        // Fallback for old sync response
        const importedCount = Array.isArray(data.list) ? data.list.length : (data?.imported || data?.length || 0);
        // Redirect to contacts page with success indication
        router.push('/contacts');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to import contacts');
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1'}/admin/contacts/import/sample`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download template');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'contacts-import-template.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Import Contacts</h1>
            <p className="text-gray-600 mt-1">Upload contacts from an Excel file</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}
      {success && (
        <Alert variant="success" message={success} onClose={() => setSuccess(null)} />
      )}

      {/* Instructions */}
      <Card>
        <CardHeader title="Import Instructions" icon={FileText} />
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How to Import Contacts</h4>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Download the template file or prepare your own Excel file</li>
              <li>Your file must have a 'phone_number' column (required)</li>
              <li>Optional columns: name, email, and any custom attributes</li>
              <li>Phone numbers must include country code (e.g., +1234567890)</li>
              <li>Upload your file and wait for processing</li>
              <li>Invalid phone numbers will be automatically detected and flagged</li>
            </ol>
          </div>

          <div>
            <Button
              variant="outline"
              onClick={downloadTemplate}
            >
              <Download className="h-5 w-5 mr-2" />
              Download Template
            </Button>
          </div>
        </div>
      </Card>

      {/* Upload Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader title="Upload File" />
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Name (Optional)
                </label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Marketing Campaign Q1 2024"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Give this import a name to organize your contacts into lists
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Excel File <span className="text-red-500">*</span>
                </label>
                <div
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".xlsx,.xls"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      Excel files (.xlsx, .xls) up to 10MB
                    </p>
                    {file && (
                      <p className="text-sm text-green-600 font-medium mt-2">
                        Selected: {file.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/contacts')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
              disabled={!file}
            >
              <Upload className="h-5 w-5 mr-2" />
              Import Contacts
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
