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
	const { life, refresh, dataVersion } = useApp();
	const { data, loading } = useLifeData();
	const [liveNotes, setLiveNotes] = useState(null);
	const [liveFolders, setLiveFolders] = useState(null);
	const [filter, setFilter] = useState('all');
	const [folderId, setFolderId] = useState('');
	const [selectedId, setSelectedId] = useState(null);
	const [draft, setDraft] = useState(null);
	const [query, setQuery] = useState('');
	const [folderModal, setFolderModal] = useState(false);
	const [folderName, setFolderName] = useState('');
	const [saveState, setSaveState] = useState('Saved');
	const editorRef = useRef(null);
	const titleRef = useRef(null);
	const lastSavedSignature = useRef('');

	useEffect(() => {
		if (!life) return undefined;
		let alive = true;
		Promise.all([life.listNotes(), life.listNoteFolders()]).then(([notesResult, foldersResult]) => {
			if (!alive) return;
			setLiveNotes(notesResult);
			setLiveFolders(foldersResult);
		});
		return () => { alive = false; };
	}, [life, dataVersion]);

	const noteRecords = liveNotes ?? data.notes;
	const folderRecords = liveFolders ?? data.noteFolders;

	const notes = useMemo(() => {
		let list = noteRecords.filter((note) => {
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
	}, [noteRecords, filter, folderId, query]);

	// Keep the clicked note available while the shared data snapshot is refreshing.
	// Without this fallback, a refresh can briefly replace data.notes and leave the
	// editor showing the empty state even though a note was just selected.
	const selected = noteRecords.find((note) => note.id === selectedId) ??
		(draft?.id === selectedId ? draft : null);

	useEffect(() => {
		const note = noteRecords.find((item) => item.id === selectedId);
		if (!note) {
			if (draft?.id !== selectedId) setDraft(null);
			return;
		}
		setDraft({ ...note });
		if (editorRef.current) editorRef.current.innerHTML = note.content ?? '';
	}, [selectedId, noteRecords]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!draft || !selectedId) return undefined;
		// Only auto-title if the title input is not focused and title is empty/default
		const titleInputFocused = titleRef.current?.contains(document.activeElement);
		const content = editorRef.current?.innerHTML ?? draft.content ?? '';
		const plainText = htmlToPlain(content);
		// Apple Notes-style: auto-title from first line when title is empty/default
		let autoTitle = draft.title;
		if (!titleInputFocused) {
			if (!autoTitle || autoTitle === 'Untitled note') {
				const firstLine = plainText.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
				autoTitle = firstLine.slice(0, 60) || 'Untitled note';
			}
		}
		const nextDraft = { ...draft, title: autoTitle, content, plainText, updatedAt: new Date().toISOString() };
		const signature = JSON.stringify({ id: selectedId, title: nextDraft.title, content, tags: nextDraft.tags, pinned: nextDraft.pinned, favorite: nextDraft.favorite, archivedAt: nextDraft.archivedAt, deletedAt: nextDraft.deletedAt });

		if (signature === lastSavedSignature.current) return undefined;

		// Optimistically update local list so typing reflects immediately (Apple Notes feel)
		setLiveNotes((prev) => {
			const base = prev ?? noteRecords;
			const exists = base.some((n) => n.id === selectedId);
			if (!exists) return base;
			return base.map((n) => (n.id === selectedId ? { ...n, ...nextDraft } : n));
		});

		setSaveState('Saving…');
		const timer = window.setTimeout(async () => {
			try {
				const saved = await life.upsertNote({ ...nextDraft, id: selectedId });
				lastSavedSignature.current = signature;
				setLiveNotes((prev) => (prev ?? noteRecords).map((n) => (n.id === selectedId ? { ...n, ...saved } : n)));
				setSaveState('Saved');
			} catch {
				setSaveState('Save failed');
			}
		}, 350);
		return () => window.clearTimeout(timer);
	}, [draft, selectedId, life, noteRecords]);

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
		setLiveNotes((prev) => [note, ...(prev ?? noteRecords)]);
		setSelectedId(note.id);
		setDraft(note);
		setFilter('all');
	};

	const patchNote = async (patch) => {
		if (!selected) return;
		const next = { ...selected, ...patch };
		setDraft(next);
		setLiveNotes((prev) => (prev ?? noteRecords).map((n) => (n.id === selectedId ? next : n)));
		await life.upsertNote(next);
	};

	const removeNote = async () => {
		if (!selected) return;
		const next = { ...selected, deletedAt: new Date().toISOString() };
		setLiveNotes((prev) => (prev ?? noteRecords).filter((n) => n.id !== selectedId));
		setSelectedId(null);
		setDraft(null);
		await life.upsertNote(next);
	};

	const restoreNote = async (note) => {
		const next = { ...note, deletedAt: null, archivedAt: null };
		setLiveNotes((prev) => [next, ...(prev ?? noteRecords)]);
		await life.upsertNote(next);
		refresh(); // Full refresh to fix ordering
	};

	const selectNote = (note) => {
		setDraft({ ...note });
		setSelectedId(note.id);
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
		const html = editorRef.current?.innerHTML ?? '';
		setDraft((current) => current ? { ...current, content: html, plainText: htmlToPlain(html) } : current);
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
					{folderRecords.map((folder, index) => (
						<div className="row gap-xs notesFolderRow" key={folder.id ?? `${folder.name}-${index}`}>
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
							{notes.map((note, index) => (
							<button
									key={`${note.id ?? note.title ?? 'note'}-${index}`}
								className={`notesListItem ${selectedId === note.id ? 'isActive' : ''}`}
								type="button"
								onClick={() => selectNote(note)}
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
								<div className="row gap-sm">
									<button className="iconBtn" type="button" title="Bold (⌘B)" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('bold')}><AppIcon name="format" size={14} /></button>
									<button className="iconBtn" type="button" title="Italic (⌘I)" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('italic')}><AppIcon name="format" size={14} /></button>
									<button className="iconBtn" type="button" title="Underline (⌘U)" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('underline')}><AppIcon name="underline" size={14} /></button>
									<button className="iconBtn" type="button" title="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('insertUnorderedList')}><AppIcon name="list" size={14} /></button>
									<button className="iconBtn" type="button" title="Numbered list" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('insertOrderedList')}><AppIcon name="list" size={14} /></button>
									<button className="iconBtn" type="button" title="Heading" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('formatBlock', 'h2')}><AppIcon name="textH1" size={14} /></button>
									<button className="iconBtn" type="button" title="Quote" onMouseDown={(event) => event.preventDefault()} onClick={() => exec('formatBlock', 'blockquote')}><AppIcon name="quote" size={14} /></button>
								</div>
								<span className={`saveIndicator ${saveState === 'Save failed' ? 'dangerText' : ''}`}>{saveState}</span>
							</div>
							<input
								ref={titleRef}
								className="notesTitleInput"
								value={draft?.title ?? ''}
								onChange={(event) => setDraft({ ...draft, title: event.target.value })}
								onFocus={() => setSaveState('')}
								onBlur={() => setSaveState('Saving…')}
								placeholder="Untitled note"
							/>
							<div
								ref={editorRef}
								className="notesRichText"
								contentEditable
								suppressContentEditableWarning
								onInput={() => setDraft((current) => current ? { ...current, content: editorRef.current?.innerHTML ?? current.content, plainText: htmlToPlain(editorRef.current?.innerHTML ?? current.content) } : current)}
								data-placeholder="Start writing…"
							/>
							<div className="notesEditorFooter">
								<div className="row gap-sm flex-wrap">
									<button className={`iconBtn ${draft?.pinned ? 'isPinned' : ''}`} type="button" title="Pin note" onClick={() => patchNote({ pinned: !draft.pinned })}><AppIcon name="pin" size={15} /></button>
									<button className={`iconBtn ${draft?.favorite ? 'isPinned' : ''}`} type="button" title="Favorite note" onClick={() => patchNote({ favorite: !draft.favorite })}>♥</button>
									<button className="iconBtn" type="button" title="Archive note" onClick={() => patchNote({ archivedAt: draft.archivedAt ? null : new Date().toISOString() })}><AppIcon name="archive" size={15} /></button>
									<button className={`iconBtn ${selected.deletedAt ? 'isPinned' : ''}`} type="button" title={selected.deletedAt ? "Restore note" : "Move to trash"} onClick={() => selected.deletedAt ? restoreNote(selected) : removeNote()}><AppIcon name={selected.deletedAt ? "pin" : "trash"} size={15} /></button>
									<input
										className="input notesTagInput"
										value={(draft?.tags ?? []).join(', ')}
										onChange={(event) => setDraft({ ...draft, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
										placeholder="Tags"
									/>
								</div>
								<span className="subtle">{wordCount(draft?.plainText ?? selected.plainText)} words · {formatUpdated(draft?.updatedAt ?? selected.updatedAt)}</span>
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
