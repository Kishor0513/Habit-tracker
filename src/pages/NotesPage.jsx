import { useEffect, useMemo, useRef, useState } from 'react';
import AppIcon from '../components/AppIcon.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Modal from '../components/Modal.jsx';
import { useApp } from '../state/AppState.jsx';
import { useLifeData } from '../state/useLifeData.js';

const FILTERS = [
	{ id: 'all', label: 'All notes', icon: 'note' },
	{ id: 'favorites', label: 'Favorites', icon: 'pin' },
	{ id: 'recent', label: 'Recent', icon: 'clock' },
	{ id: 'archive', label: 'Archive', icon: 'archive' },
	{ id: 'trash', label: 'Recently deleted', icon: 'trash' },
];

function htmlToPlain(html) {
	return new DOMParser().parseFromString(html ?? '', 'text/html').body.textContent ?? '';
}

function wordCount(text) {
	const trimmed = (text ?? '').trim();
	return trimmed ? trimmed.split(/\s+/).length : 0;
}

function formatUpdated(iso) {
	if (!iso) return '';
	const diff = Date.now() - new Date(iso).getTime();
	if (diff < 60000) return 'just now';
	if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
	if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
	if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
	return new Date(iso).toLocaleDateString();
}

export default function NotesPage() {
	const { life, refresh } = useApp();
	const { data, loading } = useLifeData();
	const [filter, setFilter] = useState('all');
	const [folderId, setFolderId] = useState('');
	const [selectedId, setSelectedId] = useState(null);
	const [draft, setDraft] = useState(null);
	const [query, setQuery] = useState('');
	const [folderModal, setFolderModal] = useState(false);
	const [folderName, setFolderName] = useState('');
	const [saveState, setSaveState] = useState('Saved');
	const editorRef = useRef(null);

	const notes = useMemo(() => {
		let list = data.notes.filter((note) => {
			if (filter === 'archive') return Boolean(note.archivedAt) && !note.deletedAt;
			if (filter === 'trash') return Boolean(note.deletedAt);
			if (note.archivedAt || note.deletedAt) return false;
			if (filter === 'favorites') return note.favorite;
			if (folderId) return note.folderId === folderId;
			return true;
		});
		if (filter === 'recent') {
			list = [...list].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 12);
		} else {
			list = [...list].sort((a, b) => {
				if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
				return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
			});
		}
		if (query.trim()) {
			const needle = query.trim().toLowerCase();
			list = list.filter((note) =>
				`${note.title} ${note.plainText ?? ''} ${(note.tags ?? []).join(' ')}`.toLowerCase().includes(needle),
			);
		}
		return list;
	}, [data.notes, filter, folderId, query]);

	const selected = data.notes.find((note) => note.id === selectedId) ?? null;

	useEffect(() => {
		const note = data.notes.find((item) => item.id === selectedId);
		if (!note) {
			setDraft(null);
			return;
		}
		setDraft({ ...note });
		if (editorRef.current) editorRef.current.innerHTML = note.content ?? '';
	}, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!draft || !selectedId) return undefined;
		setSaveState('Saving…');
		const timer = window.setTimeout(async () => {
			try {
				await life.upsertNote({
					...draft,
					id: selectedId,
					content: editorRef.current?.innerHTML ?? draft.content,
					plainText: htmlToPlain(editorRef.current?.innerHTML ?? draft.content),
				});
				setSaveState('Saved');
				refresh();
			} catch {
				setSaveState('Save failed');
			}
		}, 700);
		return () => window.clearTimeout(timer);
	}, [draft, selectedId, life, refresh]);

	useEffect(() => {
		const handler = () => createNote();
		window.addEventListener('life:new-note', handler);
		return () => window.removeEventListener('life:new-note', handler);
	}, [folderId]);

	useEffect(() => {
		function onKeyDown(event) {
			if (!(event.metaKey || event.ctrlKey)) return;
			if (event.key.toLowerCase() === 's') {
				event.preventDefault();
				if (draft && selectedId) {
					life.upsertNote({
						...draft,
						id: selectedId,
						content: editorRef.current?.innerHTML ?? draft.content,
						plainText: htmlToPlain(editorRef.current?.innerHTML ?? draft.content),
					}).then(refresh);
				}
			}
			if (event.key.toLowerCase() === 'n') {
				event.preventDefault();
				createNote();
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [draft, selectedId, life, refresh, folderId]);

	const createNote = async () => {
		const note = await life.upsertNote({
			title: 'Untitled note',
			content: '<p></p>',
			plainText: '',
			folderId: folderId || null,
			tags: [],
		});
		refresh();
		setFilter('all');
		setSelectedId(note.id);
	};

	const patchNote = async (patch) => {
		if (!selected) return;
		const next = { ...selected, ...patch };
		setDraft(next);
		await life.upsertNote(next);
		refresh();
	};

	const removeNote = async () => {
		if (!selected) return;
		await life.upsertNote({ ...selected, deletedAt: new Date().toISOString() });
		setSelectedId(null);
		refresh();
	};

	const restoreNote = async (note) => {
		await life.upsertNote({ ...note, deletedAt: null, archivedAt: null });
		refresh();
	};

	const addFolder = async () => {
		if (!folderName.trim()) return;
		await life.upsertNoteFolder({ name: folderName.trim(), orderIndex: Date.now() });
		setFolderName('');
		setFolderModal(false);
		refresh();
	};

	const exec = (command, value) => {
		editorRef.current?.focus();
		document.execCommand(command, false, value);
		setDraft((current) => current ? { ...current } : current);
	};

	return (
		<div className="pageContent notesPage">
			<div className="sectionHeader">
				<div>
					<div className="panelEyebrow">Organize</div>
					<h1 className="pageTitle">Notes</h1>
					<p className="subtle">Capture the thought. Keep the context.</p>
				</div>
				<button className="btn primary" type="button" onClick={createNote}><AppIcon name="plus" size={15} /> New note</button>
			</div>

			<div className="notesLayout">
				<aside className="notesFolders">
					<div className="popoverLabel">Library</div>
					{FILTERS.map((item) => (
						<button
							key={item.id}
							className={`notesFolder ${filter === item.id && !folderId ? 'isActive' : ''}`}
							type="button"
							onClick={() => { setFilter(item.id); setFolderId(''); setSelectedId(null); }}
						>
							<AppIcon name={item.icon} size={15} /> {item.label}
						</button>
					))}
					<div className="row between notesFolderHeader">
						<span className="popoverLabel">Folders</span>
						<button className="iconBtn ghostIcon" type="button" title="New folder" onClick={() => setFolderModal(true)}><AppIcon name="plus" size={14} /></button>
					</div>
					<button
						className={`notesFolder ${!folderId ? 'isActive' : ''}`}
						type="button"
						onClick={() => { setFolderId(''); setFilter('all'); }}
					>
						<AppIcon name="folder" size={15} /> All folders
					</button>
					{data.noteFolders.map((folder) => (
						<div className="row gap-xs notesFolderRow" key={folder.id}>
							<button
								className={`notesFolder flex-1 ${folderId === folder.id ? 'isActive' : ''}`}
								type="button"
								onClick={() => { setFolderId(folder.id); setFilter('all'); setSelectedId(null); }}
							>
								<span className="dot" style={{ background: folder.color }} /> {folder.name}
							</button>
							<button
								className="iconBtn ghostIcon"
								type="button"
								title="Delete folder"
								onClick={async () => {
									if (window.confirm(`Delete folder “${folder.name}”? Notes will be kept.`)) {
										await life.deleteNoteFolder(folder.id);
										if (folderId === folder.id) setFolderId('');
										refresh();
									}
								}}
							>
								<AppIcon name="trash" size={13} />
							</button>
						</div>
					))}
				</aside>

				<aside className="notesList">
					<input className="input notesSearch" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes…" />
					<div className="notesListScroll">
						{loading && <div className="emptyPanelState">Loading…</div>}
						{!loading && notes.length === 0 && <div className="emptyPanelState">No notes here yet.</div>}
						{notes.map((note) => (
							<button
								key={note.id}
								className={`notesListItem ${selectedId === note.id ? 'isActive' : ''}`}
								type="button"
								onClick={() => setSelectedId(note.id)}
							>
								<div className="row between">
									<strong>{note.title || 'Untitled note'}</strong>
									{note.pinned && <AppIcon name="pin" size={13} />}
								</div>
								<p className="notesPreview">{note.plainText?.slice(0, 90) || 'Empty note'}</p>
								<span className="subtle" style={{ fontSize: 10 }}>{formatUpdated(note.updatedAt)}</span>
							</button>
						))}
					</div>
				</aside>

				<section className="notesEditor">
					{!selected ? (
						<EmptyState
							emoji="📝"
							title="Pick a note or start fresh"
							body="Your notes autosave as you type. ⌘N creates a new note, ⌘S saves instantly."
							action={<button className="btn primary" type="button" onClick={createNote}>New note</button>}
						/>
					) : (
						<div className="notesEditorInner">
							<div className="notesEditorToolbar">
								<div className="row gap-xs flex-wrap">
									{[
										['bold', 'B', 'Bold'],
										['italic', 'I', 'Italic'],
										['underline', 'U', 'Underline'],
										['insertUnorderedList', '• List', 'Bullet list'],
										['insertOrderedList', '1. List', 'Numbered list'],
									].map(([command, label, title]) => (
										<button key={command} className="btn btn-sm" type="button" title={title} onMouseDown={(event) => event.preventDefault()} onClick={() => exec(command)}>{label}</button>
									))}
									<button className="btn btn-sm" type="button" title="Heading" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('formatBlock', 'h2')}>H2</button>
									<button className="btn btn-sm" type="button" title="Quote" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('formatBlock', 'blockquote')}>❝</button>
								</div>
								<span className={`saveIndicator ${saveState === 'Save failed' ? 'dangerText' : ''}`}>{saveState}</span>
							</div>
							<input
								className="notesTitleInput"
								value={draft?.title ?? ''}
								onChange={(event) => setDraft({ ...draft, title: event.target.value })}
								placeholder="Untitled note"
							/>
							<div
								ref={editorRef}
								className="notesRichText"
								contentEditable
								suppressContentEditableWarning
								onInput={() => setDraft((current) => current ? { ...current } : current)}
								data-placeholder="Start writing…"
							/>
							<div className="notesEditorFooter">
								<div className="row gap-sm flex-wrap">
									<button className={`iconBtn ${draft?.pinned ? 'isPinned' : ''}`} type="button" title="Pin note" onClick={() => patchNote({ pinned: !draft.pinned })}><AppIcon name="pin" size={15} /></button>
									<button className={`iconBtn ${draft?.favorite ? 'isPinned' : ''}`} type="button" title="Favorite note" onClick={() => patchNote({ favorite: !draft.favorite })}>♥</button>
									<button className="iconBtn" type="button" title="Archive note" onClick={() => patchNote({ archivedAt: draft.archivedAt ? null : new Date().toISOString() })}><AppIcon name="archive" size={15} /></button>
									{selected.deletedAt ? (
										<button className="btn btn-sm" type="button" onClick={() => restoreNote(selected)}>Restore</button>
									) : (
										<button className="iconBtn" type="button" title="Move to trash" onClick={removeNote}><AppIcon name="trash" size={15} /></button>
									)}
									<input
										className="input notesTagInput"
										value={(draft?.tags ?? []).join(', ')}
										onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
										placeholder="Tags"
									/>
								</div>
								<span className="subtle">{wordCount(selected.plainText)} words · {formatUpdated(selected.updatedAt)}</span>
							</div>
						</div>
					)}
				</section>
			</div>

			{folderModal && (
				<Modal
					title="New folder"
					onClose={() => setFolderModal(false)}
					actions={<>
						<button className="btn ghost" type="button" onClick={() => setFolderModal(false)}>Cancel</button>
						<button className="btn primary" type="button" onClick={addFolder} disabled={!folderName.trim()}>Create folder</button>
					</>}
				>
					<input className="input" autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="Folder name" />
				</Modal>
			)}
		</div>
	);
}
