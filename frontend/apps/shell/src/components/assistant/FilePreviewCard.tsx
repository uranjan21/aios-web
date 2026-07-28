import styled from 'styled-components'
import { FileText, X } from 'lucide-react'

export interface AttachedFile {
  id: string
  file: File
  type: string
  preview: string | null
  content?: string
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const FileCard = styled.div`
  position: relative;
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.color.border};
  background-color: ${({ theme }) => theme.color.muted}4d;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  animation: fadein ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    border-color: ${({ theme }) => theme.color.mutedForeground};
  }

  @keyframes fadein {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    padding: ${({ theme }) => `${theme.spacing[1]}`};
    background: rgba(0, 0, 0, 0.5);
    border-radius: 50%;
    color: white;
    opacity: 0;
    transition: opacity ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard}, box-shadow ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:focus-visible {
      outline: none;
      box-shadow: ${({ theme }) => theme.shadow.ring};
      opacity: 1;
    }

    &:hover {
      background: rgba(0, 0, 0, 0.7);
    }
  }

  &:hover .remove-btn {
    opacity: 1;
  }

  @media (hover: none) {
    .remove-btn {
      opacity: 0.8;
    }
  }
`

const ImagePreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const FileDetails = styled.div`
  width: 100%;
  height: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const FileIconWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};

  .icon-bg {
    padding: ${({ theme }) => `${theme.spacing[1.5]}`};
    background-color: ${({ theme }) => theme.color.muted};
    border-radius: ${({ theme }) => theme.radii.sm};
    display: flex;
  }

  .ext {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    font-weight: 500;
    color: ${({ theme }) => theme.color.mutedForeground};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const FileTextInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};

  .name {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: 500;
    color: ${({ theme }) => theme.color.foreground};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .size {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

export const PastedCard = styled(FileCard)`
  width: 112px;
  height: 112px;
  background-color: ${({ theme }) => theme.color.background};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: ${({ theme }) => theme.shadow.sm};

  .content-text {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.color.mutedForeground};
    line-height: 1.4;
    word-break: break-word;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    user-select: none;
  }

  .badge-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: ${({ theme }) => `${theme.spacing[2]}`};
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
    border-radius: ${({ theme }) => theme.radii.sm};
    border: 1px solid ${({ theme }) => theme.color.border};
    background-color: ${({ theme }) => theme.color.background};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    font-weight: bold;
    color: ${({ theme }) => theme.color.foreground};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .remove-btn {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.mutedForeground};
    border: 1px solid ${({ theme }) => theme.color.border};
  }
  &:hover .remove-btn {
    color: ${({ theme }) => theme.color.foreground};
    background: ${({ theme }) => theme.color.background};
  }
`

export function FilePreviewCard({ file, onRemove }: { file: AttachedFile; onRemove: (id: string) => void }) {
  const isImage = file.type.startsWith("image/") && file.preview
  const ext = file.file.name.split('.').pop()

  return (
    <FileCard>
      {isImage ? (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <ImagePreview src={file.preview!} alt={file.file.name} />
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.1)' }} />
        </div>
      ) : (
        <FileDetails>
          <FileIconWrapper>
            <div className="icon-bg">
              <FileText size={16} />
            </div>
            <span className="ext">{ext}</span>
          </FileIconWrapper>
          <FileTextInfo>
            <p className="name" title={file.file.name}>{file.file.name}</p>
            <p className="size">{formatFileSize(file.file.size)}</p>
          </FileTextInfo>
        </FileDetails>
      )}

      <button type="button" className="remove-btn" onClick={() => onRemove(file.id)}>
        <X size={12} />
      </button>
    </FileCard>
  )
}

export function PastedContentCard({ content, onRemove }: { content: { id: string; content: string; timestamp: Date }; onRemove: (id: string) => void }) {
  return (
    <PastedCard>
      <div style={{ overflow: 'hidden', width: '100%' }}>
        <p className="content-text">{content.content}</p>
      </div>
      <div className="badge-container">
        <div className="badge">PASTED</div>
      </div>
      <button type="button" className="remove-btn" onClick={() => onRemove(content.id)}>
        <X size={10} />
      </button>
    </PastedCard>
  )
}
