'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { ArrowLeft, FileText, MessageSquare } from 'lucide-react';
import { Template } from '@/types';
import { format } from 'date-fns';
import api from '@/lib/api';

export default function TemplateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/templates/${id}`);
      setTemplate(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load template details');
    } finally {
      setLoading(false);
    }
  };

  const renderComponent = (component: any) => {
    switch (component.type) {
      case 'HEADER':
        return (
          <div className="mb-4">
            <div className="bg-gray-100 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-600 mb-1">HEADER ({component.format})</p>
              <p className="text-gray-900">{component.text || `[${component.format} content]`}</p>
            </div>
          </div>
        );
      case 'BODY':
        return (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-1">BODY</p>
            <p className="text-gray-900 whitespace-pre-wrap">{component.text}</p>
          </div>
        );
      case 'FOOTER':
        return (
          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-600 mb-1">FOOTER</p>
              <p className="text-sm text-gray-600">{component.text}</p>
            </div>
          </div>
        );
      case 'BUTTONS':
        return (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-600 mb-2">BUTTONS</p>
            <div className="space-y-2">
              {component.buttons?.map((button: any, idx: number) => (
                <div key={idx} className="border border-gray-300 rounded-lg p-2 text-center">
                  <span className="text-blue-600 font-medium">{button.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.push('/templates')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
        <Alert variant="error" message={error || 'Template not found'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/templates')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
            <p className="text-gray-600 mt-1">{template.category} • {template.language}</p>
          </div>
        </div>
        <Badge variant={
          template.status === 'APPROVED' ? 'success' :
            template.status === 'PENDING' ? 'warning' :
              'danger'
        }>
          {template.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Information */}
        <Card>
          <CardHeader title="Template Information" icon={FileText} />
          <div className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Template Name</label>
              <p className="text-base text-gray-900 mt-1">{template.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Category</label>
              <div className="mt-1">
                <Badge variant="default">{template.category}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Language</label>
              <p className="text-base text-gray-900 mt-1">{template.language}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <div className="mt-1">
                <Badge variant={
                  template.status === 'APPROVED' ? 'success' :
                    template.status === 'PENDING' ? 'warning' :
                      'danger'
                }>
                  {template.status}
                </Badge>
              </div>
            </div>
            {template.meta_template_id && (
              <div>
                <label className="text-sm font-medium text-gray-500">Meta Template ID</label>
                <p className="text-base text-gray-900 mt-1 font-mono text-sm">{template.meta_template_id}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Created At</label>
              <p className="text-base text-gray-900 mt-1">
                {format(new Date(template.created_at), 'PPpp')}
              </p>
            </div>
          </div>
        </Card>

        {/* Template Preview */}
        <Card>
          <CardHeader title="Template Preview" icon={MessageSquare} />
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm">
              {template.components && template.components.length > 0 ? (
                template.components.map((component: any, idx: number) => (
                  <div key={idx}>{renderComponent(component)}</div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No preview available</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Status Information */}
      {template.status === 'PENDING' && (
        <Card>
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Template Pending Approval</h4>
              <p className="text-sm text-yellow-700">
                This template is pending approval from Meta. It typically takes 24-48 hours for templates to be reviewed.
                You cannot use this template in campaigns until it is approved.
              </p>
            </div>
          </div>
        </Card>
      )}

      {template.status === 'REJECTED' && (
        <Card>
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Template Rejected</h4>
              <p className="text-sm text-red-700">
                This template was rejected by Meta. Please review WhatsApp's template guidelines and create a new template
                that complies with their policies.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
