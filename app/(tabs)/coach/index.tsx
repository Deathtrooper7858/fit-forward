import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Colors, Spacing, Radius } from '../../../constants';
import { useAuthStore, useCoachStore, CoachMessage } from '../../../store';
import { sendCoachMessage, buildCoachSystemPrompt, transcribeAudio } from '../../../services/groq';
import { supabase } from '../../../services/supabase';

const FREE_MSG_LIMIT = 10;

// ─── Suggestion chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'What should I eat post-workout? 💪',
  'Give me a high-protein breakfast idea 🍳',
  'How can I reduce sugar cravings? 🍬',
  'Am I eating enough protein? 📊',
];

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: CoachMessage }) {
  const isUser = msg.role === 'user';

  // Format bold markdown **text** simply
  const formatContent = (content: string) =>
    content.replace(/\*\*(.*?)\*\*/g, '$1');

  return (
    <View style={[bubble.row, isUser && bubble.rowUser]}>
      {!isUser && (
        <LinearGradient colors={['#7C5CFC', '#4338CA']} style={bubble.avatar}>
          <Text style={bubble.avatarText}>F</Text>
        </LinearGradient>
      )}
      <View style={[bubble.box, isUser ? bubble.boxUser : bubble.boxBot]}>
        {msg.imageUrl && (
          <Image
            source={{ uri: msg.imageUrl }}
            style={{ width: 180, height: 180, borderRadius: 8, marginBottom: 8 }}
            resizeMode="cover"
          />
        )}
        <Text style={[bubble.text, isUser && bubble.textUser]}>
          {formatContent(msg.content)}
        </Text>
        <Text style={[bubble.time, isUser && { color: 'rgba(255,255,255,0.6)' }]}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const bubble = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4, paddingHorizontal: Spacing.base },
  rowUser:    { flexDirection: 'row-reverse' },
  avatar:     { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  box:        { maxWidth: '78%', borderRadius: Radius.lg, padding: 12 },
  boxBot:     { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  boxUser:    { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  text:       { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  textUser:   { color: '#fff' },
  time:       { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
});

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={[bubble.row, { paddingHorizontal: Spacing.base, marginTop: 4 }]}>
      <LinearGradient colors={['#7C5CFC', '#4338CA']} style={bubble.avatar}>
        <Text style={bubble.avatarText}>F</Text>
      </LinearGradient>
      <View style={[bubble.box, bubble.boxBot, { paddingHorizontal: 16, paddingVertical: 14 }]}>
        <ActivityIndicator color={Colors.primary} size="small" />
      </View>
    </View>
  );
}

// ─── Coach Screen ─────────────────────────────────────────────────────────────
export default function CoachScreen() {
  const [input, setInput]               = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSending, setIsSending]       = useState(false); // local send guard
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 500);
  const isRecording   = recorderState.isRecording;
  const flatRef                         = useRef<FlatList<CoachMessage>>(null);

  const {
    messages, isTyping, msgCount,
    addMessage, setMessages, setTyping, incrementCount, checkAndResetDaily,
  } = useCoachStore();
  const { profile } = useAuthStore();

  const isPro   = profile?.isPro ?? false;
  const atLimit = !isPro && msgCount >= FREE_MSG_LIMIT;

  // On mount: reset stuck isTyping + check daily message reset
  useEffect(() => {
    setTyping(false);
    setIsSending(false);
    checkAndResetDaily();

    return () => {
      if (audioRecorder.isRecording) {
        audioRecorder.stop().catch(() => {});
      }
    };
  }, []);

  // Load coach history from Supabase
  useEffect(() => {
    if (!profile?.id) return;

    async function loadHistory() {
      const { data, error } = await supabase
        .from('coach_conversations')
        .select('id, role, content, created_at')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (data && !error && data.length > 0) {
        const formatted: CoachMessage[] = data.map((m: any) => ({
          id:        String(m.id),
          role:      m.role as 'user' | 'model',
          content:   m.content ?? '',
          timestamp: m.created_at,
        }));
        setMessages(formatted);
      } else if (messages.length === 0) {
        const firstName = profile?.name?.split(' ')[0] ?? '';
        addMessage({
          id:        'welcome',
          role:      'model',
          content:   `Hi${firstName ? ` ${firstName}` : ''}! I'm Fitz, your AI nutrition coach 🤖\n\nI'm here to help you reach your goals. Ask me anything about nutrition, meals, or your progress!`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    loadHistory();
  }, [profile?.id]);

  // Scroll to bottom on new message or typing change
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(
        () => flatRef.current?.scrollToEnd({ animated: true }),
        120
      );
      return () => clearTimeout(timer);
    }
  }, [messages.length, isTyping]);

  // ─── Pick image (camera or gallery) ─────────────────────────────────────────
  const handlePickImage = useCallback(async () => {
    try {
      const { granted } = await ImagePicker.requestCameraPermissionsAsync();

      if (!granted) {
        // Fallback to gallery
        const { granted: galleryGranted } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!galleryGranted) {
          Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          base64: true, quality: 0.2, mediaTypes: ImagePicker.MediaTypeOptions.Images, // Lower quality for Groq
        });
        if (!result.canceled && result.assets?.[0]?.base64) {
          setSelectedImage(result.assets[0].base64!);
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        base64: true, quality: 0.2, // Lower quality for Groq
      });
      if (!result.canceled && result.assets?.[0]?.base64) {
        setSelectedImage(result.assets[0].base64!);
      }
    } catch {
      Alert.alert('Error', 'Could not open camera. Please try again.');
    }
  }, []);

  // ─── Voice Recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow microphone access to use voice features.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (err: any) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;

      if (uri) {
        setTyping(true);
        try {
          const text = await transcribeAudio(uri);
          if (text.trim()) {
            setInput(text);
          }
        } catch (err) {
          Alert.alert('Transcription failed', 'Could not convert voice to text.');
        } finally {
          setTyping(false);
        }
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  // ─── Send message ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();

    if (!text && !selectedImage) return;
    if (isTyping || isSending) return;

    if (atLimit) {
      router.push('/modals/paywall');
      return;
    }

    if (!profile) {
      addMessage({
        id:        `err-${Date.now()}`,
        role:      'model',
        content:   'Profile not loaded yet. Please wait a moment and try again.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const currentImg = selectedImage;

    // Optimistic UI: add user message immediately
    const userMsg: CoachMessage = {
      id:        `u-${Date.now()}`,
      role:      'user',
      content:   text || '📷 [Image]',
      imageUrl:  currentImg ? `data:image/jpeg;base64,${currentImg}` : undefined,
      timestamp: new Date().toISOString(),
    };
    addMessage(userMsg);
    incrementCount();
    setInput('');
    setSelectedImage(null);
    setIsSending(true);
    setTyping(true);

    // Persist user message to Supabase (best-effort, fire-and-forget)
    void supabase.from('coach_conversations').insert({
      user_id: profile.id,
      role:    'user',
      content: text || '[Image]',
    });

    try {
      // Build valid history:
      // 1. Filter the welcome message
      // 2. Must start with 'user' role
      // 3. Must alternate user/model (no consecutive same roles)
      let raw = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-20)
        .map((m) => ({
          role:  m.role as 'user' | 'model',
          parts: [{ text: m.content || ' ' }],
        }));

      // Strip leading model messages
      while (raw.length > 0 && raw[0].role !== 'user') {
        raw = raw.slice(1);
      }

      // Remove consecutive same-role messages (keep last of each run)
      const history: typeof raw = [];
      for (const msg of raw) {
        if (history.length > 0 && history[history.length - 1].role === msg.role) {
          history[history.length - 1] = msg; // replace with latest
        } else {
          history.push(msg);
        }
      }

      const systemPrompt = buildCoachSystemPrompt({
        name:           profile.name           ?? 'User',
        goal:           profile.goal           ?? 'maintain',
        tdee:           profile.tdee           ?? 2000,
        targetCalories: profile.targetCalories ?? 2000,
        macros:         profile.macros         ?? { protein: 150, carbs: 200, fat: 67 },
        restrictions:   profile.restrictions,
      });

      const reply = await sendCoachMessage(history, text, systemPrompt, currentImg ?? undefined);

      const botMsg: CoachMessage = {
        id:        `m-${Date.now()}`,
        role:      'model',
        content:   reply,
        timestamp: new Date().toISOString(),
      };
      addMessage(botMsg);

      // Persist bot response (best-effort, fire-and-forget)
      void supabase.from('coach_conversations').insert({
        user_id: profile.id,
        role:    'model',
        content: reply,
      });

    } catch (err: any) {
      console.error('[Coach] Error:', err?.message ?? err);
      addMessage({
        id:        `err-${Date.now()}`,
        role:      'model',
        content:   `Sorry, I couldn't connect right now. ${err?.message ?? 'Please try again.'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTyping(false);
      setIsSending(false);
    }
  }, [input, selectedImage, isTyping, isSending, atLimit, profile, messages]);

  const canSend        = (input.trim().length > 0 || !!selectedImage) && !isTyping && !isSending;
  const showSuggestions = messages.length <= 1 && !isTyping;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.headerAvatar}>
          <Text style={s.headerAvatarText}>F</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={s.headerName}>Fitz · AI Coach</Text>
          <View style={s.onlineRow}>
            <View style={s.onlineDot} />
            <Text style={s.onlineText}>Online · Powered by Groq</Text>
          </View>
        </View>
        {!isPro && (
          <View style={s.countBadge}>
            <Text style={s.countText}>
              {Math.max(FREE_MSG_LIMIT - msgCount, 0)}/{FREE_MSG_LIMIT}
            </Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList<CoachMessage>
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={s.messages}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            <>
              {isTyping && <TypingIndicator />}
              {showSuggestions && !isTyping && (
                <View style={s.suggestionsWrap}>
                  {SUGGESTIONS.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      style={s.chip}
                      onPress={() => handleSend(suggestion)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.chipText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
        />

        {/* ── Input area ── */}
        {atLimit ? (
          <View style={s.limitBanner}>
            <Text style={s.limitText}>
              🔒 Daily limit reached. Upgrade to Pro for unlimited coaching.
            </Text>
            <TouchableOpacity
              style={s.upgradeBtn}
              onPress={() => router.push('/modals/paywall')}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#F59E0B', '#D97706']} style={s.upgradeGrad}>
                <Text style={s.upgradeText}>Upgrade to Pro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.inputAreaContainer}>
            {selectedImage && (
              <View style={s.imagePreviewContainer}>
                <Image
                  source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                  style={s.imagePreview}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={() => setSelectedImage(null)}
                  style={s.removeImageBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={s.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={s.inputArea}>
              <TouchableOpacity
                onPress={handlePickImage}
                style={s.cameraBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <Text style={s.cameraEmoji}>📷</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPressIn={startRecording}
                onPressOut={stopRecording}
                style={[s.micBtn, isRecording && s.micBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={s.cameraEmoji}>{isRecording ? '🛑' : '🎙️'}</Text>
              </TouchableOpacity>

              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask Fitz anything…"
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={() => handleSend()}
              />

              <TouchableOpacity
                style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={!canSend}
                activeOpacity={0.8}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <LinearGradient colors={['#7C5CFC', '#4338CA']} style={s.sendGrad}>
                  <Text style={s.sendText}>↑</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:                 { flex: 1, backgroundColor: Colors.background },
  header:               { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerAvatar:         { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerName:           { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  onlineRow:            { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot:            { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText:           { fontSize: 11, color: Colors.success },
  countBadge:           { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  countText:            { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  messages:             { paddingVertical: Spacing.base, paddingBottom: 16 },
  suggestionsWrap:      { padding: Spacing.base, gap: 8 },
  chip:                 { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  chipText:             { color: Colors.textSecondary, fontSize: 14 },
  inputAreaContainer:   { borderTopWidth: 1, borderTopColor: Colors.border },
  imagePreviewContainer:{ padding: Spacing.base, paddingBottom: 0, flexDirection: 'row', alignItems: 'flex-start' },
  imagePreview:         { width: 64, height: 64, borderRadius: Radius.md },
  removeImageBtn:       { marginLeft: 8, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeImageText:      { color: '#fff', fontSize: 12, fontWeight: '700' },
  inputArea:            { flexDirection: 'row', gap: 8, padding: Spacing.base, alignItems: 'flex-end' },
  cameraBtn:            { padding: 8, justifyContent: 'center', alignItems: 'center' },
  micBtn:               { padding: 8, justifyContent: 'center', alignItems: 'center' },
  micBtnActive:         { backgroundColor: '#EF444422', borderRadius: Radius.full },
  cameraEmoji:          { fontSize: 24 },
  input:                { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border, maxHeight: 120 },
  sendBtn:              { borderRadius: Radius.md, overflow: 'hidden' },
  sendBtnDisabled:      { opacity: 0.35 },
  sendGrad:             { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendText:             { color: '#fff', fontSize: 22, fontWeight: '700' },
  limitBanner:          { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  limitText:            { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn:           { borderRadius: Radius.md, overflow: 'hidden' },
  upgradeGrad:          { padding: 14, alignItems: 'center' },
  upgradeText:          { color: '#fff', fontWeight: '700', fontSize: 15 },
});

