'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { Template, PhoneNumber, ContactTag, ContactList } from '@/types';
import api from '@/lib/api';
import WhatsAppMessagePreview from '@/components/shared/WhatsAppMessagePreview';

export default function NewCampaignPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_id: '',
    phone_number_id: '',
    contact_filters: {
      tag_ids: [] as string[],
      list_ids: [] as string[],
      is_valid: true,
    },
    parameter_mapping: {} as Record<string, string>,
    media_uploads: [] as Array<{ type: string; media_id: string }>,
    scheduled_at: '',
    send_immediately: false,
  });

  // State to track uploaded files for preview
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<'image' | 'video' | null>(null);

  // Options
  const [templates, setTemplates] = useState<Template[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);

  // Extract variable placeholders from template body
  const getTemplateVariables = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return [];

    // Debug: log the entire template object to see its structure
    console.log('Selected Template:', template);

    // Try multiple possible paths for the body field
    let body = (template as any).body;

    // If body is not directly available, check for nested structures
    if (!body) {
      body = (template as any).components?.find((c: any) => c.type === 'BODY')?.text;
    }

    if (!body) {
      body = (template as any).template_body;
    }

    if (!body) {
      console.warn('Template body not found for template:', templateId);
      return [];
    }

    console.log('Template Body:', body);

    // Extract variables like {{1}}, {{2}}, etc.
    const matches = body.match(/{{(\d+)}}/g);
    if (!matches) return [];

    const variables = matches.map(m => m.replace(/{{|}}/g, ''));
    console.log('Extracted Variables:', variables);

    return variables;
  };

  const templateVariables = getTemplateVariables(formData.template_id);

  // Initialize parameter_mapping when template changes
  // Also clear media uploads and uploaded file to show fresh preview
  useEffect(() => {
    if (formData.template_id && templateVariables.length > 0) {
      const newMapping: Record<string, string> = {};
      templateVariables.forEach((variable, index) => {
        if (index === 0) {
          // First variable is always fullName
          newMapping[variable] = 'fullName';
        } else {
          // Keep existing value or set to empty
          newMapping[variable] = formData.parameter_mapping[variable] || '';
        }
      });
      setFormData(prev => ({
        ...prev,
        parameter_mapping: newMapping,
        media_uploads: [], // Clear media uploads when template changes
      }));
      // Clear uploaded file preview when template changes
      setUploadedFile(null);
      setUploadedMediaType(null);
    }
  }, [formData.template_id, templates]);

  // Update media_uploads with image or video
  const handleMediaUpload = async (file: File, mediaType: 'image' | 'video') => {
    const phoneNumberId = formData.phone_number_id;
    try {
      setLoading(true);
      setUploadedFile(file); // Store file for preview display
      setUploadedMediaType(mediaType);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('phone_number_id', phoneNumberId);
      formDataUpload.append('type', mediaType);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/admin/campaigns/upload-media`, {
        method: 'POST',
        body: formDataUpload,
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
      });
      const result = await response.json();
      console.log('Upload result', result);
      if (result.success && result.data && result.data.media_id) {
        setFormData(prev => ({
          ...prev,
          media_uploads: [{ type: mediaType, media_id: result.data.media_id }],
        }));
      } else {
        setError(`Failed to upload ${mediaType}`);
      }
    } catch (err) {
      setError(`Failed to upload ${mediaType}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      const [templatesRes, phoneNumbersRes, tagsRes, listsRes] = await Promise.all([
        api.get('/admin/templates?status=APPROVED'),
        api.get('/admin/waba/phone-numbers'),
        api.get('/admin/contacts/tags'),
        api.get('/admin/contacts/lists'),
      ]);

      setTemplates(templatesRes.data || []);
      setPhoneNumbers(phoneNumbersRes.data || []);
      setTags(tagsRes.data || []);
      setLists(listsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch options', err);
    }
  };

  const token = localStorage.getItem('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Require at least one list to be selected
    if (!formData.contact_filters.list_ids || formData.contact_filters.list_ids.length === 0) {
      setError('Please select at least one contact list.');
      // Scroll to the error message near the list dropdown
      setTimeout(() => {
        const anchor = document.getElementById('list-error-anchor');
        if (anchor) {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload: any = {
        name: formData.name,
        description: formData.description,
        template_id: formData.template_id,
        phone_number_id: formData.phone_number_id,
        contact_filters: formData.contact_filters,
        parameter_mapping: formData.parameter_mapping,
      };

      // Only add media_uploads if image is uploaded
      if (formData.media_uploads.length > 0 && formData.media_uploads[0].media_id) {
        payload.media_uploads = formData.media_uploads;
      }

      // Handle scheduling
      if (formData.send_immediately) {
        payload.scheduled_at = 'now';
      } else if (formData.scheduled_at) {
        payload.scheduled_at = new Date(formData.scheduled_at).toISOString();
      } else {
        const twoMinutesFromNow = new Date();
        twoMinutesFromNow.setMinutes(twoMinutesFromNow.getMinutes() + 2);
        payload.scheduled_at = twoMinutesFromNow.toISOString();
      }

      // 1. Create campaign
      const response = await api.post('/admin/campaigns', payload);
      const campaignId = response.data.id;

      // 2. Route immediately to campaign detail page
      if (campaignId) {
        router.push(`/campaigns/${campaignId}`);
      }

      // 3. After 1 minute, start the campaign automatically
      // if (campaignId) {
      //   setTimeout(async () => {
      //     try {
      //       await fetch(`https://consoleapinew.surefy.co/v1/admin/campaigns/${campaignId}/start`, {
      //         method: 'POST',
      //         headers: {
      //           'Content-Type': 'application/json',
      //           ...(token ? { Authorization: `Bearer ${token}` } : {}),
      //         },
      //       });
      //       // Optionally show a notification that campaign started
      //     } catch (startErr) {
      //       console.error('Failed to start campaign after 1 minute', startErr);
      //     }
      //   }, 1000); // 1 minute
      // }

    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      contact_filters: { ...prev.contact_filters, [field]: value },
    }));
  };

  const handleTagToggle = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      contact_filters: {
        ...prev.contact_filters,
        tag_ids: prev.contact_filters.tag_ids.includes(tagId)
          ? prev.contact_filters.tag_ids.filter(id => id !== tagId)
          : [...prev.contact_filters.tag_ids, tagId],
      },
    }));
  };

  const handleListToggle = (listId: string) => {
    setFormData(prev => ({
      ...prev,
      contact_filters: {
        ...prev.contact_filters,
        list_ids: prev.contact_filters.list_ids.includes(listId)
          ? prev.contact_filters.list_ids.filter(id => id !== listId)
          : [...prev.contact_filters.list_ids, listId],
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
            <p className="text-gray-600 mt-1">Create a new WhatsApp broadcast campaign</p>
          </div>
        </div>
      </div>

      {/* Alerts (show only non-list errors here) */}
      {error && error !== 'Please select at least one contact list.' && (
        <Alert variant="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Form */}
      {/* The form calls handleSubmit for both Create Campaign and Send Immediately actions. */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6">
          {/* Campaign Details */}
          <Card>
            <CardHeader title="Campaign Details" />
            <div className="p-6 space-y-4">
              <Input
                label="Campaign Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Holiday Promotion 2024"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe your campaign..."
                />
              </div>
            </div>
          </Card>


          {/* Live formData and WhatsApp Preview side by side */}
          <div className="flex flex-col md:flex-row gap-4 bg-gray-100 rounded p-4 mt-6">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold mb-2">Live formData</h4>
              <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(formData, null, 2)}</pre>
            </div>
            {/* Live WhatsApp Preview */}
            {(() => {
              const template = templates.find(t => t.id === formData.template_id);
              if (!template) return null;

              // Extract components
              const headerComponent = (template as any)?.components?.find((c: any) => c.type === 'HEADER');
              const bodyComponent = (template as any)?.components?.find((c: any) => c.type === 'BODY');
              const buttonsComponent = (template as any)?.components?.find((c: any) => c.type === 'BUTTONS');
              const footerComponent = (template as any)?.components?.find((c: any) => c.type === 'FOOTER');

              let body = bodyComponent?.text;
              if (!body) {
                body = (template as any)?.body || (template as any)?.template_body;
              }
              if (!body) return null;

              // Replace variables in the template body with mapped values or placeholders
              let previewBody = body.replace(/{{(\d+)}}/g, (match: string, p1: string) => {
                const value = formData.parameter_mapping[p1] || (p1 === '1' ? 'fullName' : `{{${p1}}}`);
                return value || `{{${p1}}}`;
              });

              // Check if template has a header component with IMAGE or VIDEO format
              const hasMediaHeader = headerComponent && (headerComponent.format === 'IMAGE' || headerComponent.format === 'VIDEO');

              // Get buttons
              const buttons = buttonsComponent?.buttons?.map((btn: any) => ({
                text: btn.text,
                type: btn.type,
              })) || [];

              // Get footer
              const footer = footerComponent?.text;

              return (
                <div className="mt-0 flex-1 min-w-0 flex flex-col items-center justify-center">
                  <label className="block text-sm font-medium text-gray-600 mb-3 w-full">Live WhatsApp Preview</label>
                  <WhatsAppMessagePreview
                    message={{
                      body: previewBody,
                      buttons: buttons,
                      footer: footer,
                      uploadedImageFile: uploadedMediaType === 'image' ? uploadedFile || undefined : undefined,
                      uploadedVideoFile: uploadedMediaType === 'video' ? uploadedFile || undefined : undefined,
                      hasHeaderComponent: hasMediaHeader,
                    }}
                  />
                </div>
              );
            })()}
          </div>

          {/* Template & Phone Number */}
          <Card>
            <CardHeader title="Message Configuration" />
            <div className="p-6 space-y-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.template_id}
                    onChange={(e) => handleChange('template_id', e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 appearance-none pr-10"
                    required
                  >
                    <option value="">Select a template</option>
                    {Array.from(new Set(templates.map(t => t.category))).sort().map(category => (
                      <optgroup key={category} label={category}>
                        {templates
                          .filter(t => t.category === category)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.language})
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-sm text-gray-500">Only approved templates are shown</p>
              </div>

              <Select
                label="Phone Number"
                value={formData.phone_number_id}
                onChange={(e) => handleChange('phone_number_id', e.target.value)}
                options={[
                  { value: '', label: 'Select a phone number' },
                  ...phoneNumbers.map(p => ({ value: (p as any).phone_number_id || p.id, label: p.display_phone_number })),
                ]}
                required
              />



              {/* Parameter Mapping Fields */}
              {templateVariables.length > 0 && (
                <div className="space-y-4 mt-4">
                  <h4 className="font-semibold text-gray-700">Template Variables</h4>

                  {templateVariables.map((variable, idx) => (
                    <div key={variable} className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-600">
                        Variable {variable} {idx === 0 && '(Full Name - Auto-filled)'}
                      </label>
                      {idx === 0 ? (
                        <input
                          type="text"
                          className="border rounded px-2 py-1 text-sm flex-1 bg-gray-100"
                          value="fullName"
                          disabled
                        />
                      ) : (
                        <input
                          type="text"
                          className="border rounded px-2 py-1 text-sm flex-1"
                          value={formData.parameter_mapping[variable] || ''}
                          onChange={e => setFormData(prev => ({
                            ...prev,
                            parameter_mapping: {
                              ...prev.parameter_mapping,
                              [variable]: e.target.value,
                            },
                          }))}
                          placeholder={`Enter value for variable ${variable}`}
                        />
                      )}
                    </div>
                  ))}

                  {/* Live WhatsApp-style template preview */}
                  {(() => {
                    const template = templates.find(t => t.id === formData.template_id);
                    let body = (template as any)?.body;
                    if (!body) {
                      body = (template as any)?.components?.find((c: any) => c.type === 'BODY')?.text;
                    }
                    if (!body) {
                      body = (template as any)?.template_body;
                    }
                    if (!body) return null;

                    // Replace variables in the template body with mapped values or placeholders
                    let preview = body.replace(/{{(\d+)}}/g, (match, p1) => {
                      const value = formData.parameter_mapping[p1] || (p1 === '1' ? 'fullName' : `{{${p1}}}`);
                      return value || `{{${p1}}}`;
                    });
                  })()}

                  {/* Only show media upload if template has header component of type IMAGE or VIDEO */}
                  {(() => {
                    const template = templates.find(t => t.id === formData.template_id);
                    const headerComponent = template?.components?.find((c: any) => c.type === 'HEADER');
                    const headerFormat = headerComponent?.format;
                    if (headerFormat === 'IMAGE' || headerFormat === 'VIDEO') {
                      const selectedMediaType = (formData.media_uploads[0]?.type as 'image' | 'video' | undefined)
                        || (headerFormat === 'VIDEO' ? 'video' : 'image');
                      return (
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-medium text-gray-600">Header Media (Optional)</label>
                          <div className="flex gap-2 items-center mb-2">
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={selectedMediaType}
                              onChange={e => {
                                const newType = e.target.value;
                                setFormData(prev => ({
                                  ...prev,
                                  media_uploads: [{
                                    type: newType,
                                    media_id: '', // reset media_id when type changes
                                  }],
                                }));
                                setUploadedFile(null);
                                setUploadedMediaType(newType === 'video' ? 'video' : 'image');
                              }}
                            >
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                            </select>
                            <input
                              type="file"
                              accept={selectedMediaType === 'video' ? 'video/*' : 'image/*'}
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  const type: 'image' | 'video' = selectedMediaType === 'video' ? 'video' : 'image';
                                  if (formData.media_uploads.length === 0) {
                                    setFormData(prev => ({
                                      ...prev,
                                      media_uploads: [{ type, media_id: '' }],
                                    }));
                                  }
                                  handleMediaUpload(e.target.files[0], type);
                                }
                              }}
                            />
                          </div>
                          {formData.media_uploads.length > 0 && formData.media_uploads[0]?.media_id && (
                            <span className="text-green-600 text-xs">✓ {formData.media_uploads[0]?.type === 'video' ? 'Video' : 'Image'} uploaded successfully</span>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          </Card>

          {/* Contact Selection */}
          <Card>
            <CardHeader title="Target Audience" />
            <div className="p-6 space-y-4">

              {/* Error message for list selection, shown here for visibility */}
              <div id="list-error-anchor">
                {error === 'Please select at least one contact list.' && (
                  <Alert variant="error" message={error} onClose={() => setError(null)} />
                )}
              </div>

              {/* Multi-Select Contact Lists */}
              {lists.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Contact List(s) <span className="text-red-500">*</span>
                  </label>
                  
                  {/* Selected Lists Display */}
                  {formData.contact_filters.list_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      {formData.contact_filters.list_ids.map(listId => {
                        const list = lists.find(l => l.id === listId);
                        if (!list) return null;
                        return (
                          <div
                            key={listId}
                            className="inline-flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-full text-sm font-medium"
                          >
                            <span>{list.name} ({list.total_contacts})</span>
                            <button
                              type="button"
                              onClick={() => handleListToggle(listId)}
                              className="hover:bg-blue-600 rounded-full p-0.5 transition-colors"
                              aria-label={`Remove ${list.name}`}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown to Add More Lists */}
                  <select
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 appearance-none pr-10"
                    value=""
                    onChange={e => {
                      const value = e.target.value;
                      if (value && !formData.contact_filters.list_ids.includes(value)) {
                        handleListToggle(value);
                      }
                    }}
                  >
                    <option value="">+ Add contact list</option>
                    {lists
                      .filter(list => !formData.contact_filters.list_ids.includes(list.id))
                      .map(list => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.total_contacts} contacts)
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Select multiple contact lists. Campaign will be sent to all contacts in selected lists.
                  </p>
                </div>
              )}

              {/* Lists Multi-Select Checkboxes */}
              {/* {lists.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Lists (Optional)
                  </label>
                  <div className="space-y-2">
                    {lists.map((list) => (
                      <label
                        key={list.id}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.contact_filters.list_ids.includes(list.id)}
                          onChange={() => handleListToggle(list.id)}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{list.name}</p>
                          <p className="text-sm text-gray-500">{list.total_contacts} contacts</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )} */}

              {/* <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.contact_filters.is_valid}
                    onChange={(e) => handleFilterChange('is_valid', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Only send to valid contacts</span>
                </label>
                <p className="text-sm text-gray-500 mt-1 ml-6">
                  Recommended to avoid sending to invalid WhatsApp numbers
                </p>
              </div> */}
            </div>
          </Card>

          {/* Schedule */}
          <Card>
            <CardHeader title="Schedule Campaign" />
            <div className="p-6 space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.send_immediately}
                    onChange={(e) => handleChange('send_immediately', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Send immediately</span>
                </label>
                <p className="text-sm text-gray-500 mt-1 ml-6">
                  Campaign will start within 5 minutes
                </p>
              </div>

              {!formData.send_immediately && (
                <Input
                  label="Schedule Date & Time"
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => handleChange('scheduled_at', e.target.value)}
                  required={!formData.send_immediately}
                  helperText="Campaign will start at the specified time"
                />
              )}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/campaigns')}
            >
              Cancel
            </Button>
            {/*
              The same submit button triggers handleSubmit. If send_immediately is checked,
              the payload will be sent with send_immediately and the campaign will be started immediately.
              If you want a separate button for Send Immediately, you can add another button here.
            */}
            <Button
              type="submit"
              variant="primary"
              isLoading={loading}
            >
              <Send className="h-5 w-5 mr-2" />
              {formData.send_immediately ? 'Send Immediately' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
