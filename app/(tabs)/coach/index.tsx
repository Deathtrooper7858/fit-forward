import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '../../../constants';
import { useAuthStore, useCoachStore, CoachMessage } from '../../../store';
import { sendCoachMessage, buildCoachSystemPrompt } from '../../../services/gemini';
import { supabase } from '../../../services/supabase';

const FREE_MSG_LIMIT = 10;

// ─── Suggestion chips ─────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'What should I eat post-workout? 💪',
  'Give me a high-protein breakfast idea 🍳',
  'How can I reduce sugar cravings? 🍬',
  'Am I eating enough protein? 📊',
];

function MessageBubble({ msg }: { msg: CoachMessage }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[bubble.row, isUser && bubble.rowUser]}>
      {!isUser && (
        <LinearGradient colors={['#7C5CFC', '#4338CA']} style={bubble.avatar}>
          <Text style={bubble.avatarText}>F</Text>
        </LinearGradient>
      )}
      <View style={[bubble.box, isUser ? bubble.boxUser : bubble.boxBot]}>
        {msg.imageUrl && (
          <Image source={{ uri: msg.imageUrl }} style={{ width: 180, height: 180, borderRadius: 8, marginBottom: 8 }} />
        )}
        <Text style={[bubble.text, isUser && bubble.textUser]}>{msg.content}</Text>
        <Text style={bubble.time}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
}

const bubble = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginVertical: 4, paddingHorizontal: Spacing.base },
  rowUser:   { flexDirection: 'row-reverse' },
  avatar:    { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  box:       { maxWidth: '78%', borderRadius: Radius.lg, padding: 12 },
  boxBot:    { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  boxUser:   { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  text:      { fontSize: 15, color: Colors.textPrimary, lineHeight: 22 },
  textUser:  { color: '#fff' },
  time:      { fontSize: 10, color: Colors.textMuted, marginTop: 4, textAlign: 'right' },
});

// ─── Coach Screen ─────────────────────────────────────────────────────────────
export default function CoachScreen() {
  const [input, setInput]         = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const flatRef                   = useRef<FlatList>(null);

  const {
    messages, isTyping, msgCount,
    addMessage, setMessages, setTyping, incrementCount, checkAndResetDaily,
  } = useCoachStore();
  const { profile } = useAuthStore();

  const isPro   = profile?.isPro ?? false;
  const atLimit = !isPro && msgCount >= FREE_MSG_LIMIT;

  // Reset isTyping (can get stuck across hot reloads) + daily reset
  useEffect(() => {
    setTyping(false);
    checkAndResetDaily();
  }, []);

  // Load coach history from Supabase
  useEffect(() => {
    async function loadHistory() {
      if (!profile?.id) return;

      const { data, error } = await supabase
        .from('coach_conversations')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(50); // only last 50 messages for performance

      if (data && !error && data.length > 0) {
        const formatted = data.map((m: any) => ({
          id:        m.id,
          role:      m.role as 'user' | 'model',
          content:   m.content,
          timestamp: m.created_at,
        }));
        setMessages(formatted);
      } else if (messages.length === 0) {
        addMessage({
          id:        'welcome',
          role:      'model',
          content:   `Hi${profile?.name ? ` ${profile.name.split(' ')[0]}` : ''}! I'm **Fitz**, your AI nutrition coach 🤖\n\nI'm here to help you reach your goals. Ask me anything about nutrition, meals, or your progress!`,
          timestamp: new Date().toISOString(),
        });
      }
    }
    loadHistory();
  }, [profile?.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  const handlePickImage = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      ImagePicker.requestMediaLibraryPermissionsAsync(); // fallback: gallery
      const result2 = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });
      if (!result2.canceled && result2.assets?.[0]?.base64) {
        setSelectedImage(result2.assets[0].base64);
      }
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setSelectedImage(result.assets[0].base64);
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = overrideText ?? input.trim();

    // Guard: nothing to send
    if (!text && !selectedImage) return;
    if (isTyping) return;
    if (atLimit) {
      router.push('/modals/paywall');
      return;
    }

    // Guard: no profile — show message instead of silently failing
    if (!profile) {
      addMessage({
        id:        `err-${Date.now()}`,
        role:      'model',
        content:   'Profile not loaded yet. Please wait a moment and try again.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const userMsg: CoachMessage = {
      id:        `u-${Date.now()}`,
      role:      'user',
      content:   text || '📷 [Image]',
      imageUrl:  selectedImage ? `data:image/jpeg;base64,${selectedImage}` : undefined,
      timestamp: new Date().toISOString(),
    };

    const currentImg = selectedImage;
    addMessage(userMsg);
    incrementCount();
    setInput('');
    setSelectedImage(null);
    setTyping(true);

    // Save user message to Supabase (non-blocking, best-effort)
    if (profile.id) {
      supabase.from('coach_conversations').insert({
        user_id: profile.id,
        role:    'user',
        content: text || '[Image]',
      }).then(() => {}).catch(() => {});
    }

    try {
      // Build Gemini history — must start with 'user' role
      let rawHistory = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-20)
        .map((m) => ({ role: m.role as 'user' | 'model', parts: [{ text: m.content }] }));

      // Gemini API requires alternating user/model roles starting with 'user'
      // Drop leading model messages if any
      while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
        rawHistory = rawHistory.slice(1);
      }
      // Ensure proper alternation (remove consecutive same-role messages)
      const history: typeof rawHistory = [];
      for (const msg of rawHistory) {
        if (history.length === 0 || history[history.length - 1].role !== msg.role) {
          history.push(msg);
        }
      }

      const systemPrompt = buildCoachSystemPrompt({
        name:           profile.name ?? 'User',
        goal:           profile.goal ?? 'maintain',
        tdee:           profile.tdee ?? 2000,
        targetCalories: profile.targetCalories ?? 2000,
        macros:         profile.macros ?? { protein: 150, carbs: 200, fat: 67 },
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

      // Save bot response (non-blocking)
      if (profile.id) {
        supabase.from('coach_conversations').insert({
          user_id: profile.id,
          role:    'model',
          content: reply,
        }).then(() => {}).catch(() => {});
      }

    } catch (err: any) {
      console.error('[Coach] sendCoachMessage error:', err);
      addMessage({
        id:        `err-${Date.now()}`,
        role:      'model',
        content:   `Sorry, I had trouble connecting. ${err?.message ?? 'Please try again.'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setTyping(false);
    }
  };

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
            <Text style={s.onlineText}>Online · Powered by Gemini</Text>
          </View>
        </View>
        {!isPro && (
          <View style={s.countBadge}>
            <Text style={s.countText}>{Math.max(FREE_MSG_LIMIT - msgCount, 0)}/{FREE_MSG_LIMIT}</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={s.messages}
          ListFooterComponent={
            <>
              {isTyping && (
                <View style={[bubble.row, { paddingHorizontal: Spacing.base, marginTop: 4 }]}>
                  <LinearGradient colors={['#7C5CFC', '#4338CA']} style={bubble.avatar}>
                    <Text style={bubble.avatarText}>F</Text>
                  </LinearGradient>
                  <View style={[bubble.box, bubble.boxBot, { paddingHorizontal: 16 }]}>
                    <ActivityIndicator color={Colors.primary} size="small" />
                  </View>
                </View>
              )}
              {/* Suggestions */}
              {showSuggestions && (
                <View style={s.suggestionsWrap}>
                  {SUGGESTIONS.map((s_) => (
                    <TouchableOpacity
                      key={s_}
                      style={s.chip}
                      onPress={() => handleSend(s_)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.chipText}>{s_}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          }
        />

        {/* Input area */}
        {atLimit ? (
          <View style={s.limitBanner}>
            <Text style={s.limitText}>🔒 Daily limit reached. Upgrade to Pro for unlimited coaching.</Text>
            <TouchableOpacity style={s.upgradeBtn} onPress={() => router.push('/modals/paywall')}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={s.upgradeGrad}>
                <Text style={s.upgradeText}>Upgrade to Pro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.inputAreaContainer}>
            {selectedImage && (
              <View style={s.imagePreviewContainer}>
                <Image source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} style={s.imagePreview} />
                <TouchableOpacity onPress={() => setSelectedImage(null)} style={s.removeImageBtn}>
                  <Text style={s.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={s.inputArea}>
              <TouchableOpacity onPress={handlePickImage} style={s.cameraBtn}>
                <Text style={s.cameraEmoji}>📷</Text>
              </TouchableOpacity>
              <TextInput
                style={s.input}
                value={input}
                onChangeText={setInput}
                placeholder="Ask Fitz anything…"
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
                blurOnSubmit={false}
                onSubmitEditing={() => handleSend()}
              />
              <TouchableOpacity
                style={[s.sendBtn, ((!input.trim() && !selectedImage) || isTyping) && s.sendBtnDisabled]}
                onPress={() => handleSend()}
                disabled={(!input.trim() && !selectedImage) || isTyping}
                activeOpacity={0.8}
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

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: Colors.background },
  header:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerAvatar:     { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  headerAvatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  headerName:       { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  onlineRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  onlineText:       { fontSize: 11, color: Colors.success },
  countBadge:       { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  countText:        { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  messages:         { paddingVertical: Spacing.base, paddingBottom: 8 },
  suggestionsWrap:  { padding: Spacing.base, gap: 8 },
  chip:             { backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  chipText:         { color: Colors.textSecondary, fontSize: 14 },
  inputAreaContainer:{ borderTopWidth: 1, borderTopColor: Colors.border },
  imagePreviewContainer:{ padding: Spacing.base, paddingBottom: 0, flexDirection: 'row', alignItems: 'flex-start' },
  imagePreview:     { width: 60, height: 60, borderRadius: Radius.md },
  removeImageBtn:   { marginLeft: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  removeImageText:  { color: '#fff', fontSize: 12, fontWeight: '700' },
  inputArea:        { flexDirection: 'row', gap: 8, padding: Spacing.base, alignItems: 'flex-end' },
  cameraBtn:        { padding: 8, justifyContent: 'center', alignItems: 'center' },
  cameraEmoji:      { fontSize: 24 },
  input:            { flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border, maxHeight: 120 },
  sendBtn:          { borderRadius: Radius.md, overflow: 'hidden' },
  sendBtnDisabled:  { opacity: 0.4 },
  sendGrad:         { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  sendText:         { color: '#fff', fontSize: 22, fontWeight: '700' },
  limitBanner:      { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border, gap: 10 },
  limitText:        { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  upgradeBtn:       { borderRadius: Radius.md, overflow: 'hidden' },
  upgradeGrad:      { padding: 14, alignItems: 'center' },
  upgradeText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
});
