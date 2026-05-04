import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const roots = ['index.html', 'src'];
const extensions = new Set(['.html', '.jsx', '.tsx']);
const requiredRelValues = ['noopener', 'noreferrer'];

async function listFiles(entry) {
	const stat = await readdir(entry, { withFileTypes: true }).catch(() => null);

	if (!stat) {
		return [entry];
	}

	const files = [];

	for (const item of stat) {
		const itemPath = path.join(entry, item.name);

		if (item.isDirectory()) {
			files.push(...(await listFiles(itemPath)));
		} else if (item.isFile() && extensions.has(path.extname(item.name))) {
			files.push(itemPath);
		}
	}

	return files;
}

function getLineNumber(content, index) {
	return content.slice(0, index).split(/\r?\n/).length;
}

function getAttributeValue(tag, attributeName) {
	const quotedPattern = new RegExp(`${attributeName}\\s*=\\s*["']([^"']*)["']`, 'i');
	const bracedPattern = new RegExp(`${attributeName}\\s*=\\s*\\{\\s*["']([^"']*)["']\\s*\\}`, 'i');

	return tag.match(quotedPattern)?.[1] ?? tag.match(bracedPattern)?.[1] ?? null;
}

const findings = [];

for (const root of roots) {
	for (const file of await listFiles(root)) {
		if (!extensions.has(path.extname(file))) continue;

		const content = await readFile(file, 'utf8');
		const anchorTags = content.matchAll(/<a\b[^>]*>/gi);

		for (const match of anchorTags) {
			const tag = match[0];
			const target = getAttributeValue(tag, 'target');

			if (target !== '_blank') continue;

			const rel = getAttributeValue(tag, 'rel');
			const relValues = new Set((rel ?? '').split(/\s+/).filter(Boolean));
			const missing = requiredRelValues.filter((value) => !relValues.has(value));

			if (missing.length > 0) {
				findings.push({
					file,
					line: getLineNumber(content, match.index),
					missing,
				});
			}
		}
	}
}

if (findings.length > 0) {
	console.error('External link audit failed. target="_blank" anchors must include rel="noopener noreferrer".');

	for (const finding of findings) {
		console.error(`- ${finding.file}:${finding.line} missing ${finding.missing.join(', ')}`);
	}

	process.exit(1);
}

console.log('External link audit passed.');
