import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  Chip,
  IconButton,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

type InteractionKey = 'UNSAFE' | 'DANGEROUS' | 'CAUTION' | 'SAFE' | 'UNKNOWN';

interface Session {
  id: string;
  substance?: string;
  primary?: string;
  secondary?: string;
  combo?: string;
  location: string;
  mode: string;
  createdAt: string;
  status: 'planned' | 'active' | 'completed';
  startedAt?: string;
  observers?: string[];
  interactionStatus?: InteractionKey;
}

/* ----------------- ADDED: interaction mapping + meta (matches PlanTab) ----------------- */
const INTERACTION_MATRIX: Record<string, InteractionKey> = {
  'ALCOHOL+KETAMINE': 'DANGEROUS',
  'ALCOHOL+MDMA': 'CAUTION',
  'ALCOHOL+COCAINE': 'UNSAFE',
  'KETAMINE+MDMA': 'SAFE',
  'KETAMINE+COCAINE': 'CAUTION',
  'MDMA+COCAINE': 'CAUTION',
  'COCAINE+KETAMINE': 'CAUTION',
  'COCAINE+MDMA': 'CAUTION',
  'COCAINE+ALCOHOL': 'UNSAFE',
  // add more pairs if you need
};

const STATUS_META: Record<
  InteractionKey,
  { label: string; color: string; textColor?: string }
> = {
  UNSAFE: { label: 'Unsafe', color: '#FF1E3A', textColor: '#fff' },
  DANGEROUS: { label: 'Dangerous', color: '#FF6B35', textColor: '#111' },
  CAUTION: { label: 'Caution', color: '#FFC857', textColor: '#111' },
  SAFE: { label: 'Safe', color: '#00F5A0', textColor: '#111' },
  UNKNOWN: { label: 'Unknown', color: '#9CA3AF', textColor: '#111' },
};
/* ------------------------------------------------------------------------------------- */

export default function LogTab() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogSessionId, setDialogSessionId] = useState<string | null>(null);
  const [friendName, setFriendName] = useState('');
  const [friendsTemp, setFriendsTemp] = useState<string[]>([]);

  const loadSessions = async () => {
    try {
      const data = await AsyncStorage.getItem('sessions');
      if (data) {
        const parsed: Session[] = JSON.parse(data);
        setSessions(parsed);
      } else {
        setSessions([]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load sessions');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const handleStartSession = async (sessionId: string) => {
    try {
      const updatedSessions = sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              status: 'active' as const,
              startedAt: new Date().toISOString(),
            }
          : session
      );
      await AsyncStorage.setItem('sessions', JSON.stringify(updatedSessions));
      await AsyncStorage.setItem('activeSessionId', sessionId);
      setSessions(updatedSessions);
      router.push('/(tabs)/tracking');
    } catch (error) {
      Alert.alert('Error', 'Failed to start session');
    }
  };

  // confirm + delete -------------------------------------------------------
  const confirmDeleteSession = (sessionId: string) => {
    Alert.alert(
      'Delete session',
      'Are you sure you want to delete this session? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSession(sessionId),
        },
      ]
    );
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const updated = sessions.filter((s) => s.id !== sessionId);
      await AsyncStorage.setItem('sessions', JSON.stringify(updated));

      // If the deleted session was active, remove activeSessionId
      const activeId = await AsyncStorage.getItem('activeSessionId');
      if (activeId === sessionId) {
        await AsyncStorage.removeItem('activeSessionId');
      }

      setSessions(updated);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete session');
    }
  };
  // -----------------------------------------------------------------------

  // helpers for display ----------------------------------------------------

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'Solo':
        return '#4DD0E1';
      case 'Duo':
        return '#81C784';
      case 'Group':
        return '#FFB86B';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planned':
        return '#9CA3AF';
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#4D96FF';
      default:
        return '#9CA3AF';
    }
  };

  const getDisplayTitle = (s: Session) => {
    if (s.combo) return s.combo.replace('+', ' + ');
    if (s.primary && s.secondary) return `${s.primary} + ${s.secondary}`;
    if (s.primary) return s.primary;
    if (s.substance) return s.substance;
    return 'Unknown';
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const getComboColor = (s: Session) => {
    const key =
      s.combo ||
      (s.primary && s.secondary ? `${s.primary}+${s.secondary}` : undefined);
    if (!key) return '#E5E7EB';
    const map: Record<string, string> = {
      'MDMA+LSD': '#FF7AB6',
      'LSD+MDMA': '#FF7AB6',
      'MDMA+MDMA': '#FF8A80',
      'LSD+LSD': '#A78BFA',
      'CANNABIS+CANNABIS': '#7FB77E',
      'CANNABIS+MDMA': '#F7B267',
      'CANNABIS+LSD': '#9AD3BC',
    };
    const normalized = key.toUpperCase();
    return map[normalized] || '#E5E7EB';
  };

  /* ----------------- derive interaction key from combo/primary+secondary ----------------- */
  const normalizeComboKey = (s: Session) => {
    if (s.combo && s.combo.trim().length > 0) return s.combo.toUpperCase();
    if (s.primary && s.secondary) {
      const pair = [s.primary.toUpperCase(), s.secondary.toUpperCase()].sort();
      return `${pair[0]}+${pair[1]}`;
    }
    return '';
  };

  const deriveInteractionStatus = (s: Session): InteractionKey => {
    // prefer stored interactionStatus if present
    if (s.interactionStatus) return s.interactionStatus;
    const comboKey = normalizeComboKey(s);
    if (!comboKey) return 'UNKNOWN';
    return INTERACTION_MATRIX[comboKey] ?? 'UNKNOWN';
  };
  /* ----------------------------------------------------------------------------------------------- */

  /* ------------------- Dialog handlers for adding observers ------------------- */

  const openAddFriendsDialog = (sessionId: string) => {
    const s = sessions.find((x) => x.id === sessionId);
    setDialogSessionId(sessionId);
    setFriendsTemp(s?.observers ? [...s.observers] : []);
    setFriendName('');
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setDialogSessionId(null);
    setFriendName('');
    setFriendsTemp([]);
  };

  const addFriendToTemp = () => {
    const trimmed = friendName.trim();
    if (!trimmed) return;
    if (friendsTemp.includes(trimmed)) {
      setFriendName('');
      return;
    }
    setFriendsTemp((prev) => [...prev, trimmed]);
    setFriendName('');
  };

  const removeFriendFromTemp = (name: string) => {
    setFriendsTemp((prev) => prev.filter((f) => f !== name));
  };

  const saveFriends = async () => {
    if (!dialogSessionId) return;
    try {
      const updated = sessions.map((s) =>
        s.id === dialogSessionId ? { ...s, observers: friendsTemp } : s
      );
      await AsyncStorage.setItem('sessions', JSON.stringify(updated));
      setSessions(updated);
      closeDialog();
    } catch (error) {
      Alert.alert('Error', 'Failed to save observers');
    }
  };

  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Session Log
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Your planned and active sessions
        </Text>

        {sessions.length === 0 ? (
          <Card style={[styles.card, styles.emptyCard]}>
            <Card.Content>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No sessions yet
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Create a plan in the Plan tab to get started
              </Text>
              <Button
                mode="contained"
                onPress={() => router.push('/(tabs)/plan')}
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}
              >
                Create a Plan
              </Button>
            </Card.Content>
          </Card>
        ) : (
          sessions
            .slice()
            .reverse()
            .map((session) => {
              const statusColor = getStatusColor(session.status);
              const modeColor = getModeColor(session.mode);
              const comboColor = getComboColor(session);
              const title = getDisplayTitle(session);

              /* ------------------- compute interaction meta for display ------------------- */
              const interactionKey = deriveInteractionStatus(session); // derived or stored
              const interactionMeta = STATUS_META[interactionKey];
              /* -------------------------------------------------------------------------------- */

              return (
                <Card
                  key={session.id}
                  style={[styles.card, styles.sessionCard]}
                >
                  <Card.Content>
                    {/* ================= REPLACED HEADER BLOCK =================
                        New header layout (left rail, center title + token, right controls)
                        ======================================================= */}
                    <View style={styles.cardHeader}>
                      {/* LEFT: narrow status rail */}
                      <View style={styles.statusColumn}>
                        <View
                          style={[
                            styles.statusIndicator,
                            { backgroundColor: statusColor },
                          ]}
                        />
                      </View>
                      {/* CENTER: title + interaction token + meta */}
                      <View style={styles.headerCenter}>
                        <View style={styles.titleRow}>
                          <Text
                            variant="titleLarge"
                            style={styles.substance}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {title}
                          </Text>
                        </View>

                        <Text
                          variant="bodySmall"
                          style={styles.meta}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {session.location} • {formatDate(session.createdAt)}
                        </Text>
                      </View>
                      <View style={styles.headerRight}>
                        <TouchableOpacity
                          style={styles.addObserverButton}
                          onPress={() => openAddFriendsDialog(session.id)}
                          accessibilityLabel={`Add observers for ${title}`}
                        >
                          <IconButton
                            icon="plus"
                            size={16}
                            iconColor="#0B1221"
                            style={styles.addObserverIcon}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* <Chip
                      mode="flat"
                      style={[styles.modeChip, { borderColor: modeColor }]}
                      textStyle={styles.chipText}
                    >
                      {session.mode}
                    </Chip> */}
                    <View style={styles.detailRow}>
                      <Text variant="bodyMedium" style={styles.detailLabel}>
                        Mode:
                      </Text>
                      <Text variant="bodyMedium" style={styles.chipText}>
                        {session.mode}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text variant="bodyMedium" style={styles.detailLabel}>
                        Status:
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={[styles.statusText, { color: statusColor }]}
                      >
                        {session.status.charAt(0).toUpperCase() +
                          session.status.slice(1)}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text variant="bodyMedium" style={styles.detailLabel}>
                        Started:
                      </Text>
                      <Text variant="bodyMedium" style={styles.regularText}>
                        {session.startedAt
                          ? formatDate(session.startedAt)
                          : '-'}
                      </Text>
                    </View>

                    {/* Observers inline (label + names on same line) */}
                    {session.observers && session.observers.length > 0 && (
                      <View style={styles.observersRow}>
                        <Text style={styles.observersLabel} numberOfLines={1}>
                          Observer{session.observers.length > 1 ? 's' : ''}:
                        </Text>
                        <Text
                          style={styles.observersText}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {' ' + session.observers.join(', ')}
                        </Text>
                      </View>
                    )}

                    <View style={styles.actionsRow}>
                      {session.status === 'planned' ? (
                        <Button
                          mode="contained"
                          onPress={() => handleStartSession(session.id)}
                          style={styles.primaryButton}
                          contentStyle={styles.buttonContent}
                        >
                          Start Session
                        </Button>
                      ) : (
                        <Button
                          mode="outlined"
                          onPress={() => router.push('/(tabs)/tracking')}
                          style={styles.outlinedButton}
                          contentStyle={styles.buttonContent}
                        >
                          View Tracking
                        </Button>
                      )}

                      <Button
                        mode="text"
                        icon="trash-can-outline"
                        onPress={() => confirmDeleteSession(session.id)}
                        textColor="#FF1E3A"
                        style={styles.deleteTextButton}
                        contentStyle={styles.buttonContent}
                      >
                        Delete
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={closeDialog}>
          <Dialog.Title>Add Observers</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Friend name"
              value={friendName}
              onChangeText={setFriendName}
              onSubmitEditing={addFriendToTemp}
              right={
                <TextInput.Icon
                  icon="plus"
                  onPress={addFriendToTemp}
                  forceTextInputFocus={false}
                />
              }
            />
            <View
              style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 }}
            >
              {friendsTemp.map((f) => (
                <Chip
                  key={f}
                  style={{ marginRight: 8, marginBottom: 8 }}
                  onClose={() => removeFriendFromTemp(f)}
                >
                  {f}
                </Chip>
              ))}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDialog}>Cancel</Button>
            <Button onPress={saveFriends}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1221',
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    marginTop: 6,
    marginBottom: 4,
    fontWeight: '700',
    color: '#E8F9FF',
  },

  subtitle: {
    marginBottom: 18,
    color: '#A6C5D8',
  },

  card: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },

  sessionCard: {
    shadowColor: '#00BCD4',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  emptyCard: {
    marginTop: 28,
    alignItems: 'center',
  },

  emptyText: {
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '700',
    color: '#E8F9FF',
  },

  emptySubtext: {
    textAlign: 'center',
    color: '#8EAFC0',
    marginBottom: 12,
  },

  /* ---------------- NEW header layout styles ---------------- */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  /* left thin rail */
  statusColumn: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusIndicator: {
    width: 6,
    height: 48,
    borderRadius: 4,
  },

  /* center: title + meta */
  headerCenter: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingRight: 8,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // gap not universally supported; if unsupported, we rely on marginLeft on token
  },

  substance: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E8F9FF',
    flexShrink: 1,
  },

  meta: {
    color: '#8EAFC0',
    fontSize: 12,
  },

  /* interaction token (small pill next to title) */
  interactionToken: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  interactionTokenText: {
    fontWeight: '700',
    fontSize: 11,
  },

  /* right side */
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },

  modeChip: {
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginRight: 6,
    paddingHorizontal: 8,
  },

  chipText: {
    color: '#82E9DE',
    fontWeight: '700',
    fontSize: 12,
  },

  comboCube: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginLeft: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  comboIcon: {
    margin: 0,
    backgroundColor: 'transparent',
  },

  addObserverButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FF2D95',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    elevation: 2,
  },
  addObserverIcon: {
    margin: 0,
    backgroundColor: 'transparent',
    padding: 0,
  },

  deleteIcon: {
    marginLeft: 6,
    backgroundColor: 'transparent',
  },

  deleteTextButton: {
    marginLeft: 8,
  },

  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  detailLabel: {
    fontWeight: '700',
    marginRight: 8,
    color: '#E8F9FF',
  },

  statusText: {
    fontWeight: '700',
  },

  regularText: {
    color: '#E8F9FF',
  },

  actionsRow: {
    flexDirection: 'row',
    marginTop: 32,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  primaryButton: {
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#4DD0E1',
  },

  outlinedButton: {
    borderRadius: 10,
    marginRight: 12,
    borderColor: 'rgba(77,208,225,0.6)',
    backgroundColor: 'transparent',
  },

  ghostButton: {
    marginRight: 0,
  },

  buttonContent: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  /* observers inline */
  observersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  observersLabel: {
    color: '#9fb7b6',
    fontWeight: '700',
    fontSize: 12,
  },
  observersText: {
    color: '#E8F9FF',
    flex: 1,
    flexShrink: 1,
  },
});
