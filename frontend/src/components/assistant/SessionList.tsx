/**
 * Shared chat session list — used by the GlobalAssistant history sidebar and
 * the ChatPage rail. Owns fetching, the per-session menu, and the rename /
 * delete dialogs (@ledgr/ui Dialog — never native prompt/confirm).
 */
import { useEffect, useRef, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, MessageSquare } from 'lucide-react'
import { Button, ConfirmDialog, Dialog, DialogFooter, Input } from '@ledgr/ui'
import { chatApi } from '@/api/chat'
import type { ChatSession } from '@/types'

const List = styled.ul`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};
  display: flex;
  flex-direction: column;
  gap: 2px;
  list-style: none;
  margin: 0;
`

const Item = styled.li`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
`

const SelectBtn = styled.button.attrs({ type: 'button' })<{ $active?: boolean }>`
  flex: 1;
  border: none;
  padding: 10px 12px;
  background: ${({ theme, $active }) => $active ? theme.color.muted : 'transparent'};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 12px;
  cursor: pointer;
  color: ${({ theme, $active }) => $active ? theme.color.foreground : theme.color.mutedForeground};
  font-weight: ${({ $active }) => $active ? 500 : 400};
  display: flex;
  align-items: center;
  min-width: 0;
  text-align: left;
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: ${({ theme }) => theme.color.muted};
    color: ${({ theme }) => theme.color.foreground};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

const Title = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
  text-align: left;
`

const ActionBtn = styled.button.attrs({ type: 'button' })`
  background: transparent;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  padding: 2px;
  border-radius: ${({ theme }) => theme.radii.sm};
  opacity: 0.5;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  &:hover {
    background: ${({ theme }) => theme.color.border};
    opacity: 1;
    color: ${({ theme }) => theme.color.foreground};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

const Menu = styled.div`
  position: absolute;
  right: 12px;
  margin-top: 24px;
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  display: flex;
  flex-direction: column;
  z-index: 101;
  min-width: 120px;
  padding: 4px;
`

const MenuItem = styled.button.attrs({ type: 'button' })`
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  border: none;
  background: transparent;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.color.foreground};
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: ${({ theme }) => theme.color.muted};
  }
  &:focus-visible {
    outline: none;
    background: ${({ theme }) => theme.color.muted};
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

export function SessionList({ activeSessionId, onSelect, onNew }: {
  activeSessionId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const theme = useTheme()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [menuId, setMenuId] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<ChatSession | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState<ChatSession | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const fetchSessions = async () => {
    try {
      const data = await chatApi.sessions()
      setSessions([...data].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()))
    } catch (e) {
      console.error('Failed to load chat sessions:', e)
    }
  }

  useEffect(() => { fetchSessions() }, [activeSessionId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuId(null)
      }
    }
    if (menuId) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuId])

  const handleRename = async () => {
    if (!renaming) return
    const title = renameValue.trim()
    if (title && title !== renaming.title) {
      try {
        await chatApi.updateSession(renaming.id, { title })
        fetchSessions()
      } catch {
        toast.error('Could not rename chat')
      }
    }
    setRenaming(null)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await chatApi.deleteSession(deleting.id)
      if (activeSessionId === deleting.id) onNew()
      fetchSessions()
    } catch {
      toast.error('Could not delete chat')
    }
    setDeleting(null)
  }

  return (
    <>
      <List>
        <Item>
          <SelectBtn onClick={onNew} $active={!activeSessionId}>
            <Plus size={14} style={{ marginRight: 6 }} /> New Chat
          </SelectBtn>
        </Item>
        {sessions.map(session => (
          <Item key={session.id}>
            <SelectBtn onClick={() => onSelect(session.id)} $active={session.id === activeSessionId}>
              <Title>{session.title || new Date(session.started_at).toLocaleString()}</Title>
            </SelectBtn>

            <div style={{ position: 'relative' }}>
              <ActionBtn
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuId(menuId === session.id ? null : session.id)
                }}
                aria-label="Session actions"
              >
                <MoreHorizontal size={14} />
              </ActionBtn>

              {menuId === session.id && (
                <Menu ref={menuRef}>
                  <MenuItem onClick={(e) => {
                    e.stopPropagation()
                    setMenuId(null)
                    setRenameValue(session.title || '')
                    setRenaming(session)
                  }}>Rename</MenuItem>
                  <MenuItem onClick={async (e) => {
                    e.stopPropagation()
                    setMenuId(null)
                    try {
                      await chatApi.updateSession(session.id, { is_archived: true })
                      if (activeSessionId === session.id) onNew()
                      fetchSessions()
                    } catch {
                      toast.error('Could not archive chat')
                    }
                  }}>Archive</MenuItem>
                  <MenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuId(null)
                      setDeleting(session)
                    }}
                    style={{ color: theme.color.destructive }}
                  >Delete</MenuItem>
                </Menu>
              )}
            </div>
          </Item>
        ))}
      </List>

      <Dialog
        open={renaming !== null}
        onOpenChange={(open) => { if (!open) setRenaming(null) }}
        title="Rename chat"
        icon={<MessageSquare size={16} />}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleRename() }}>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Chat title"
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button type="submit" size="sm">Save</Button>
          </DialogFooter>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Delete chat?"
        description="This permanently removes the conversation and its messages."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
