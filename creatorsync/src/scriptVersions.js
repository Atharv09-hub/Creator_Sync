import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

const scriptsCollection = collection(db, 'scripts');
const pipelineCollection = collection(db, 'kanbanTasks');
const historyCollection = (scriptId) => collection(db, 'scripts', scriptId, 'history');
const scriptDocument = (scriptId) => doc(scriptsCollection, scriptId);
const pipelineDocument = (scriptId) => doc(pipelineCollection, scriptId);

const buildScriptPayload = ({ title, content, userId }) => ({
  title: title.trim(),
  content: content.trim(),
  userId,
  updatedAt: Timestamp.now()
});

const buildPipelinePayload = ({ title, content, userId, scriptId, existingTask }) => {
  const now = Timestamp.now();
  const basePayload = {
    title: title.trim(),
    script: content.trim(),
    scriptStatus: 'Draft',
    userId,
    source: 'script',
    scriptId,
    updatedAt: now
  };

  if (existingTask) {
    return basePayload;
  }

  return {
    ...basePayload,
    tags: [],
    priority: 'Medium',
    platform: 'YouTube',
    column: 'script',
    status: 'Writing',
    deadline: '',
    reminder: '',
    clipUrl: '',
    rawClipUrl: '',
    progress: 35,
    scheduledFor: '',
    publishStatus: 'Queued',
    metrics: { views: 0, likes: 0 },
    timestamp: now
  };
};

const syncPipelineTaskForScript = async ({ scriptId, title, content, userId }) => {
  const ref = pipelineDocument(scriptId);
  const snapshot = await getDoc(ref);
  const payload = buildPipelinePayload({
    title,
    content,
    userId,
    scriptId,
    existingTask: snapshot.exists()
  });

  if (snapshot.exists()) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, payload);
  }

  return { id: scriptId, ...payload };
};

export const saveVersionToHistory = async (scriptId, content, userId) => {
  if (!scriptId) {
    return null;
  }

  return addDoc(historyCollection(scriptId), {
    content,
    createdAt: Timestamp.now(),
    userId
  });
};

export const fetchHistory = async (scriptId) => {
  if (!scriptId) {
    return [];
  }

  const historyQuery = query(historyCollection(scriptId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(historyQuery);

  return snapshot.docs.map((historyDoc) => ({
    id: historyDoc.id,
    ...historyDoc.data()
  }));
};

export const saveScript = async ({ scriptId, title, content, userId }) => {
  if (!scriptId) {
    throw new Error('scriptId is required.');
  }

  const ref = scriptDocument(scriptId);
  const snapshot = await getDoc(ref);
  const payload = buildScriptPayload({ title, content, userId });

  if (snapshot.exists()) {
    const previousContent = snapshot.data()?.content ?? '';
    await saveVersionToHistory(scriptId, previousContent, userId);

    await updateDoc(ref, payload);
    await syncPipelineTaskForScript({
      scriptId,
      title,
      content,
      userId
    });
    return { id: scriptId, ...payload };
  }

  await setDoc(ref, payload);
  await syncPipelineTaskForScript({
    scriptId,
    title,
    content,
    userId
  });
  return { id: scriptId, ...payload };
};

export const deleteScript = async (scriptId) => {
  if (!scriptId) {
    return;
  }

  await Promise.allSettled([
    deleteDoc(scriptDocument(scriptId)),
    deleteDoc(pipelineDocument(scriptId))
  ]);
};

export const restoreVersion = async ({ scriptId, versionContent, title, userId }) => {
  if (!scriptId) {
    throw new Error('scriptId is required.');
  }

  const ref = scriptDocument(scriptId);
  const snapshot = await getDoc(ref);
  const currentContent = snapshot.exists() ? snapshot.data()?.content ?? '' : '';
  const currentTitle = snapshot.exists() ? snapshot.data()?.title ?? title ?? '' : title ?? '';

  if (snapshot.exists()) {
    await saveVersionToHistory(scriptId, currentContent, userId);
  }

  const payload = buildScriptPayload({
    title: currentTitle,
    content: versionContent,
    userId
  });

  if (snapshot.exists()) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, payload);
  }

  await syncPipelineTaskForScript({
    scriptId,
    title: currentTitle,
    content: versionContent,
    userId
  });

  return { id: scriptId, ...payload };
};
