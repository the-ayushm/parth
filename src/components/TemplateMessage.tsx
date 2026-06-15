/* eslint-disable @next/next/no-img-element */
import React from "react";
import { Phone } from "lucide-react";

interface TemplateComponent {
  type: string;
  text?: string;
  format?: string;
  example?: {
    header_handle?: string[];
  };
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  parameters?: Array<{
    type?: string;
    text?: string;
    image?: {
      id?: string;
      link?: string;
    };
  }>;
}

interface TemplateMessageProps {
  components: TemplateComponent[];
  className?: string;
  mediaUrl?: string | null;
  phoneNumberId?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  contentPayload?: any;
}

export const TemplateMessage: React.FC<TemplateMessageProps> = ({
  components,
  className = "",
  mediaUrl,
  phoneNumberId,
  templateName,
  templateLanguage,
  contentPayload,
}) => {
  if (!components || !Array.isArray(components)) {
    return null;
  }

  const normalized = components.map((component) => ({
    ...component,
    type: String(component.type || "").toUpperCase(),
  }));

  const headerComponent = normalized.find((c) => c.type === "HEADER");
  const bodyComponent = normalized.find((c) => c.type === "BODY");
  const footerComponent = normalized.find((c) => c.type === "FOOTER");
  const buttonsComponent = normalized.find((c) => c.type === "BUTTONS");

  const bodyText = bodyComponent?.text || "";
  const bodyParameters =
    bodyComponent?.parameters
      ?.map((p) => p?.text)
      .filter((value): value is string => Boolean(value && String(value).trim())) || [];

  const headerParameterLines =
    headerComponent?.parameters
      ?.map((param) => {
        const paramType = String(param?.type || "").toLowerCase();
        if (paramType === "image") {
          const imageId = param?.image?.id ? `id: ${param.image.id}` : "";
          const imageLink = param?.image?.link ? `link: ${param.image.link}` : "";
          return [imageId, imageLink].filter(Boolean).join(" | ") || "image";
        }
        return param?.text?.trim() || "";
      })
      .filter((value): value is string => Boolean(value && value.trim())) || [];

  const footerText =
    footerComponent?.text ||
    footerComponent?.parameters
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join(" | ");

  const headerText =
    headerComponent?.text ||
    headerComponent?.parameters
      ?.map((p) => p?.text)
      .filter(Boolean)
      .join(" | ");

  const headerImageUrl =
    ((headerComponent?.format || "").toUpperCase() === "IMAGE" ||
      headerComponent?.parameters?.some((p) => p?.image?.link || p?.image?.id)) &&
    (headerComponent?.parameters?.find((p) => p?.image?.link)?.image?.link ||
      headerComponent?.parameters?.find((p) => p?.image?.id)?.image?.id ||
      headerComponent?.example?.header_handle?.[0] ||
      mediaUrl);

  const hasHeaderImageParam =
    !!headerComponent?.parameters?.some((p) => p?.image?.link || p?.image?.id);

  const cachedHeaderImageUrl = React.useMemo(() => {
    if (!headerImageUrl || typeof window === "undefined") return null;
    if (/^https?:\/\//i.test(headerImageUrl)) return null;

    try {
      const raw = localStorage.getItem("wa_template_media_preview_map");
      const map = raw ? JSON.parse(raw) : {};
      const cached = map[String(headerImageUrl)];
      return typeof cached === "string" && cached.trim() ? cached : null;
    } catch {
      return null;
    }
  }, [headerImageUrl]);

  const resolvedHeaderImageUrl = (() => {
    if (!headerImageUrl) return null;
    if (/^https?:\/\//i.test(headerImageUrl)) return headerImageUrl;
    if (cachedHeaderImageUrl) return cachedHeaderImageUrl;
    if (headerImageUrl === mediaUrl) return headerImageUrl;
    if (hasHeaderImageParam && phoneNumberId) {
      return `/api/user/whatsapp/media/${encodeURIComponent(headerImageUrl)}?phoneNumberId=${encodeURIComponent(phoneNumberId)}`;
    }
    return null;
  })();

  return (
    <div className={`template-message ${className}`}>
      {templateName ? (
        <div className="template-footer" style={{ marginBottom: 6 }}>
          Template: {templateName}
        </div>
      ) : null}

      {templateLanguage ? (
        <div className="template-footer" style={{ marginBottom: 6 }}>
          Language: {templateLanguage}
        </div>
      ) : null}

      {/* Header - Image or Text */}
      {headerComponent && (
        <div className="template-header">
          {resolvedHeaderImageUrl ? (
            <img
              src={resolvedHeaderImageUrl}
              alt="Template header"
              className="template-header-image"
            />
          ) : headerText ? (
            <div className="template-header-text">{headerText}</div>
          ) : null}

          {!headerImageUrl && !headerText && headerParameterLines.length > 0 ? (
            <div className="template-body">
              {headerParameterLines.map((value, index) => (
                <div key={`${value}-${index}`}>{`Header ${index + 1}: ${value}`}</div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* Body */}
      {bodyText && (
        <div className="template-body">
          {bodyText}
        </div>
      )}

      {!bodyText && bodyParameters.length > 0 ? (
        <div className="template-body">
          {bodyParameters.map((value, index) => (
            <div key={`${value}-${index}`}>{`Body ${index + 1}: ${value}`}</div>
          ))}
        </div>
      ) : null}

      {/* Footer */}
      {footerText && (
        <div className="template-footer">
          {footerText}
        </div>
      )}

      {/* Buttons */}
      {buttonsComponent?.buttons && buttonsComponent.buttons.length > 0 && (
        <>
          {buttonsComponent.buttons.map((button, index) => (
            <a
              key={index}
              href={button.url || button.phone_number || "#"}
              className="template-button"
            >
              {button.type === "PHONE_NUMBER" && <Phone size={14} />}
              {button.type === "URL" && "🔗"}
              {button.text}
            </a>
          ))}
        </>
      )}
    </div>
  );
};
