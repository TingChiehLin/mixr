import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Text, Button, Card, Chip, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ThumbsUp, AlertCircle, Plus, Users } from 'lucide-react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';

interface Session {
  id: string;
  substance?: string;
  location?: string; // user-supplied location string or "lat,lng"
  mode?: string;
  startedAt?: string;
  substances?: string[];
  status?: 'planned' | 'active' | 'completed';
  observers?: string[];
}

const NEON = {
  magenta: '#FF2D95',
  teal: '#00F5A0',
  cyan: '#39D2FF',
  amber: '#FFC857',
  orange: '#FF6B35',
  red: '#FF1E3A',
  slate: '#0B1220',
  charcoal: '#071018',
  muted: '#7B8790',
  text: '#E6F6F5',
};

export default function TrackingTab() {
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [checkIns, setCheckIns] = useState<string[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );

  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  const loadActiveSession = async () => {
    try {
      const sessionId = await AsyncStorage.getItem('activeSessionId');
      if (!sessionId) {
        setActiveSession(null);
        return;
      }
      const sessionsData = await AsyncStorage.getItem('sessions');
      if (sessionsData) {
        const sessions: Session[] = JSON.parse(sessionsData);
        const active = sessions.find((s) => s.id === sessionId);
        setActiveSession(active ?? null);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Error loading active session:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActiveSession();
      setCheckIns([]);
    }, [])
  );

  // timer
  useEffect(() => {
    if (!activeSession?.startedAt) {
      setElapsedTime(0);
      return;
    }
    const interval = setInterval(() => {
      const start = new Date(activeSession.startedAt!).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // map prep (unchanged)
  useEffect(() => {
    let mounted = true;
    const prepareMap = async () => {
      if (!activeSession) {
        setCoords(null);
        setRegion(null);
        return;
      }
      setMapLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!mounted) return;
        if (status !== 'granted') {
          setPermissionGranted(false);
          setMapLoading(false);
          return;
        }
        setPermissionGranted(true);

        let resolved: { latitude: number; longitude: number } | null = null;
        const loc = (activeSession.location || '').trim();

        const coordMatch = loc.match(
          /^\s*([-+]?\d{1,3}(?:\.\d+)?)[,\s]+([-+]?\d{1,3}(?:\.\d+)?)\s*$/
        );
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lon = parseFloat(coordMatch[2]);
          if (!isNaN(lat) && !isNaN(lon))
            resolved = { latitude: lat, longitude: lon };
        }

        if (!resolved && loc.length > 0) {
          try {
            const geo = await Location.geocodeAsync(loc);
            if (geo && geo.length > 0)
              resolved = {
                latitude: geo[0].latitude,
                longitude: geo[0].longitude,
              };
          } catch (geError) {
            console.warn('Geocode failed:', geError);
            resolved = null;
          }
        }

        if (!resolved) {
          try {
            const pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Highest,
            });
            resolved = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
          } catch (posError) {
            console.warn('Could not get device location:', posError);
            resolved = null;
          }
        }

        if (mounted && resolved) {
          setCoords(resolved);
          setRegion({ ...resolved, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        }
      } catch (err) {
        console.error('prepareMap error:', err);
      } finally {
        if (mounted) setMapLoading(false);
      }
    };
    prepareMap();
    return () => {
      mounted = false;
    };
  }, [activeSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOkCheckIn = () => {
    const ts = new Date().toLocaleTimeString();
    setCheckIns((p) => [...p, `OK at ${ts}`]);
    Alert.alert('Check-in recorded', 'Stay safe!');
  };

  const handleRequestHelp = () => {
    Alert.alert(
      'Emergency Resources',
      'In an emergency, call 000\n\nNational Alcohol and Other Drug Hotline:\n1800 250 015\n\nLifeline: 13 11 14',
      [{ text: 'OK' }]
    );
  };

  const handleAddSubstance = async () => {
    if ((Alert as any).prompt) {
      (Alert as any).prompt(
        'Add Substance',
        'What substance did you take?',
        async (text: string | undefined) => {
          if (text && activeSession) {
            try {
              const sessionsData = await AsyncStorage.getItem('sessions');
              if (sessionsData) {
                const sessions: Session[] = JSON.parse(sessionsData);
                const updated = sessions.map((s) =>
                  s.id === activeSession.id
                    ? {
                        ...s,
                        substances: [
                          ...(s.substances ||
                            (s.substance ? [s.substance] : [])),
                          text,
                        ],
                      }
                    : s
                );
                await AsyncStorage.setItem('sessions', JSON.stringify(updated));
                await loadActiveSession();
                Alert.alert('Substance added', 'Logged successfully');
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to add substance');
            }
          }
        }
      );
      return;
    }
    Alert.alert('Add Substance', 'Text prompt not supported on this platform.');
  };

  const handleEndSession = async () => {
    try {
      const sessionId = await AsyncStorage.getItem('activeSessionId');
      if (!sessionId) {
        setActiveSession(null);
        setElapsedTime(0);
        setCheckIns([]);
        Alert.alert('Session ended', 'No active session found.');
        return;
      }
      const sessionsData = await AsyncStorage.getItem('sessions');
      if (sessionsData) {
        const sessions: Session[] = JSON.parse(sessionsData);
        const updated = sessions.map((s) =>
          s.id === sessionId ? { ...s, status: 'completed' } : s
        );
        await AsyncStorage.setItem('sessions', JSON.stringify(updated));
      }
      await AsyncStorage.removeItem('activeSessionId');
      setActiveSession(null);
      setElapsedTime(0);
      setCheckIns([]);
      Alert.alert('Session ended', 'Take care of yourself');
    } catch (err) {
      Alert.alert('Error', 'Failed to end session');
    }
  };

  const confirmDeleteSession = () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This action cannot be undone and will remove all session data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const sessionId = await AsyncStorage.getItem('activeSessionId');
              if (!sessionId) {
                Alert.alert('Error', 'No active session found to delete.');
                return;
              }
              const sessionsData = await AsyncStorage.getItem('sessions');
              if (sessionsData) {
                const sessions: Session[] = JSON.parse(sessionsData);
                const updated = sessions.filter((s) => s.id !== sessionId);
                await AsyncStorage.setItem('sessions', JSON.stringify(updated));
              }
              await AsyncStorage.removeItem('activeSessionId');
              setActiveSession(null);
              setElapsedTime(0);
              setCheckIns([]);
              Alert.alert(
                'Session deleted',
                'Session has been permanently removed.'
              );
            } catch (err) {
              Alert.alert('Error', 'Failed to delete session');
            }
          },
        },
      ]
    );
  };

  if (!activeSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Active Session</Text>
          <Text style={styles.emptyText}>
            Start a session from the Log tab to begin tracking
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // open maps helper
  const openInMaps = async (lat?: number, lng?: number) => {
    if (!lat || !lng) {
      Alert.alert(
        'No coordinates',
        'No coordinates available to open in maps.'
      );
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const can = await Linking.canOpenURL(url);
    if (can) Linking.openURL(url);
    else Alert.alert('Unable to open maps', url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          {/* ======== Redesigned Session Card (visual improvements) ======== */}
          <Card style={styles.sessionCard} mode="elevated">
            <Card.Content style={styles.sessionCardContent}>
              {/* left accent column */}
              <View style={styles.accentRow}>
                <View
                  style={[
                    styles.accentBar,
                    activeSession.status === 'active'
                      ? { backgroundColor: NEON.teal }
                      : activeSession.status === 'completed'
                      ? { backgroundColor: NEON.cyan }
                      : { backgroundColor: NEON.muted },
                  ]}
                />
                <View style={styles.cardBody}>
                  <View style={styles.headerTop}>
                    <View style={styles.titleBlock}>
                      <Text
                        variant="titleLarge"
                        style={styles.substance}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {activeSession.substance ||
                          activeSession.substances?.join(', ') ||
                          'Session'}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={styles.location}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {activeSession.location || 'Unknown location'}
                      </Text>
                    </View>

                    {/* small controls aligned right */}
                    <View style={styles.headerControls}>
                      <IconButton
                        icon="map-marker"
                        size={18}
                        iconColor={NEON.cyan}
                        onPress={() => {
                          if (coords)
                            openInMaps(coords.latitude, coords.longitude);
                          else
                            Alert.alert(
                              'No coordinates',
                              'Location not available yet'
                            );
                        }}
                        style={styles.iconBtn}
                      />
                      <TouchableOpacity
                        style={styles.floatingAction}
                        onPress={() => {
                          /* optionally open people view */
                        }}
                      >
                        <Users color={NEON.charcoal} size={16} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* meta row: started + mode + observers (all rendered as pills) */}
                  <View style={styles.metaPillsRow}>
                    <View style={styles.pill}>
                      <Text style={styles.pillLabel}>Started</Text>
                      <Text style={styles.pillValue}>
                        {activeSession.startedAt
                          ? new Date(
                              activeSession.startedAt
                            ).toLocaleTimeString()
                          : '-'}
                      </Text>
                    </View>

                    <View style={[styles.pill, styles.modePill]}>
                      <Text style={styles.pillLabel}>Mode</Text>
                      <Text style={styles.pillValue}>
                        {activeSession.mode || 'Solo'}
                      </Text>
                    </View>

                    {/* << CHANGED: Observers are now a pill to align visually with Started/Mode */}
                    {activeSession.observers &&
                    activeSession.observers.length > 0 ? (
                      <View style={[styles.pill, styles.observersPill]}>
                        <Text style={styles.pillLabel}>Observers</Text>
                        <Text
                          style={[styles.pillValue, styles.observersPillValue]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {activeSession.observers.join(', ')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* observers inline as small chips (scrollable) - optional extra row */}
                  {/* {activeSession.observers &&
                    activeSession.observers.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.observersChipsRow}
                        contentContainerStyle={{ paddingRight: 8 }}
                      >
                        {activeSession.observers.map((o, idx) => (
                          <Chip
                            key={o + idx}
                            style={styles.observerChip}
                            compact
                          >
                            {o}
                          </Chip>
                        ))}
                      </ScrollView>
                    )} */}
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* TIMER */}
          <View style={styles.timerContainer}>
            <Text variant="displayLarge" style={styles.timer}>
              {formatTime(elapsedTime)}
            </Text>
            <Text variant="bodyMedium" style={styles.timerLabel}>
              Session time elapsed
            </Text>
          </View>

          {/* MAP area remains same as your previous implementation */}
          <View style={styles.mapWrap}>
            {mapLoading && (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color={NEON.cyan} />
                <Text style={styles.mapLoadingText}>Loading map…</Text>
              </View>
            )}

            {permissionGranted === false && !coords && (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>
                  Location permission is required to show your location on the
                  map.
                </Text>
              </View>
            )}

            {!mapLoading && permissionGranted !== false && region && (
              <MapView
                style={styles.map}
                initialRegion={region}
                region={region}
                showsUserLocation
                showsMyLocationButton={false}
              >
                {coords && (
                  <Marker
                    coordinate={{
                      latitude: coords.latitude,
                      longitude: coords.longitude,
                    }}
                    title="Session location"
                    description={activeSession.location || 'Current location'}
                  />
                )}
              </MapView>
            )}
          </View>

          {/* recenter button with white text */}
          <View style={styles.recenterRow}>
            <Button
              mode="contained"
              onPress={async () => {
                setMapLoading(true);
                try {
                  const pos = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Highest,
                  });
                  const newCoords = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                  };
                  setCoords(newCoords);
                  setRegion({
                    ...newCoords,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  });
                } catch (e) {
                  Alert.alert('Error', 'Unable to get current location');
                } finally {
                  setMapLoading(false);
                }
              }}
              style={[
                styles.actionButton,
                { alignSelf: 'flex-start', height: 48 },
              ]}
              contentStyle={{ justifyContent: 'center' }}
              textColor="#FFFFFF"
            >
              Recenter to my location
            </Button>
          </View>

          {/* Action buttons (same layout) */}
          <View style={styles.buttonGrid}>
            <Button
              mode="contained"
              onPress={handleOkCheckIn}
              style={[styles.actionButton, styles.okButton]}
              contentStyle={{ padding: 0 }}
            >
              <View style={styles.actionInner}>
                <ThumbsUp size={28} color={NEON.text} />
                <Text style={styles.buttonText}>I'm OK</Text>
              </View>
            </Button>

            <Button
              mode="contained"
              onPress={handleRequestHelp}
              style={[styles.actionButton, styles.helpButton]}
              contentStyle={{ padding: 0 }}
            >
              <View style={styles.actionInner}>
                <AlertCircle size={28} color={NEON.text} />
                <Text style={styles.buttonText}>Request Help</Text>
              </View>
            </Button>

            <Button
              mode="contained"
              onPress={handleAddSubstance}
              style={[styles.actionButton, styles.addButton]}
              contentStyle={{ padding: 0 }}
            >
              <View style={styles.actionInner}>
                <Plus size={28} color={NEON.text} />
                <Text style={styles.buttonText}>Add Substance</Text>
              </View>
            </Button>
          </View>

          {(activeSession.mode === 'Duo' || activeSession.mode === 'Group') && (
            <Button
              mode="outlined"
              onPress={() =>
                Alert.alert('Friends', 'Friend list feature coming soon')
              }
              style={styles.friendsButton}
              contentStyle={styles.friendsButtonContent}
              icon={() => <Users size={18} color={NEON.cyan} />}
            >
              <Text style={styles.friendsText}>View Friends</Text>
            </Button>
          )}

          {checkIns.length > 0 && (
            <Card style={styles.checkInsCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.checkInsTitle}>
                  Recent Check-ins
                </Text>
                {checkIns
                  .slice(-5)
                  .reverse()
                  .map((c, i) => (
                    <Text key={i} style={styles.checkInItem}>
                      • {c}
                    </Text>
                  ))}
              </Card.Content>
            </Card>
          )}

          <View style={styles.sessionActions}>
            <Button
              mode="outlined"
              onPress={handleEndSession}
              style={styles.endButton}
              textColor={NEON.red}
            >
              End Session
            </Button>
            <Button
              mode="outlined"
              onPress={confirmDeleteSession}
              style={styles.deleteButton}
              textColor={NEON.red}
              icon="trash-can-outline"
            >
              Delete Session
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: NEON.charcoal },
  container: { padding: 20, paddingBottom: 60 },
  content: { gap: 16 },

  /* empty */
  emptyContainer: {
    marginTop: 24,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontWeight: '800',
    color: NEON.cyan,
    marginBottom: 8,
    fontSize: 20,
  },
  emptyText: { color: NEON.muted, textAlign: 'center' },

  /* SESSION CARD */
  sessionCard: {
    borderRadius: 16,
    backgroundColor: NEON.slate,
    borderWidth: 1,
    borderColor: '#0f2430',
    marginBottom: 8,
    shadowColor: NEON.cyan,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  sessionCardContent: {
    paddingVertical: 32,
    paddingHorizontal: 16,
  },

  /* accent + body */
  accentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  accentBar: {
    width: 6,
    borderRadius: 4,
    height: '100%',
    marginRight: 12,
    alignSelf: 'stretch',
  },
  cardBody: { flex: 1, minWidth: 0 },

  /* header top: title + controls */
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: { flex: 1, minWidth: 0, marginRight: 8 },
  substance: {
    fontWeight: '800',
    color: NEON.text,
    fontSize: 18,
    flexShrink: 1,
  },
  location: { color: NEON.muted, marginTop: 4 },

  headerControls: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { backgroundColor: 'transparent', margin: 0 },
  floatingAction: {
    marginLeft: 8,
    backgroundColor: NEON.cyan,
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  /* pills row */
  metaPillsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    minWidth: 84,
    maxWidth: 220, // keep long content constrained
  },
  modePill: { backgroundColor: 'rgba(255,255,255,0.03)' },
  pillLabel: { color: NEON.muted, fontSize: 11, fontWeight: '700' },
  pillValue: { color: NEON.text, fontWeight: '700', fontSize: 13 },

  /* Observers pill specifics */
  observersPill: {
    // slightly different background if you want
  },
  observersPillValue: {
    // small, single-line truncation
    fontSize: 12,
    color: NEON.text,
  },

  observersChip: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginLeft: 6,
    height: 34,
    justifyContent: 'center',
  },
  observersChipText: { color: NEON.text, marginLeft: 6 },

  /* observer chips row */
  observersChipsRow: { marginTop: 10 },
  observerChip: { marginRight: 8, backgroundColor: 'rgba(255,255,255,0.03)' },

  /* timer/map/buttons unchanged styling (kept for consistency) */
  timerContainer: { alignItems: 'center', marginVertical: 8, marginBottom: 12 },
  timer: { fontWeight: '800', color: NEON.cyan, fontSize: 40 },
  timerLabel: { color: NEON.muted, marginTop: 6 },

  mapWrap: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#061016',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  map: { flex: 1 },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  mapLoadingText: { color: NEON.muted, marginTop: 8 },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mapPlaceholderText: { color: NEON.muted, textAlign: 'center' },

  recenterRow: { marginBottom: 12 },

  buttonGrid: { flexDirection: 'column', gap: 12, marginBottom: 12 },
  actionButton: {
    borderRadius: 14,
    height: 84,
    justifyContent: 'center',
    backgroundColor: NEON.slate,
  },

  actionInner: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  okButton: { backgroundColor: NEON.teal },
  helpButton: { backgroundColor: NEON.red },
  addButton: { backgroundColor: NEON.magenta },
  buttonText: {
    color: NEON.charcoal,
    fontWeight: '800',
    marginTop: 6,
    fontSize: 16,
  },

  friendsButton: {
    borderRadius: 12,
    borderColor: 'rgba(57,210,255,0.12)',
    backgroundColor: 'transparent',
    marginVertical: 8,
  },
  friendsButtonContent: { paddingVertical: 10, gap: 8 },
  friendsText: { color: NEON.cyan, fontWeight: '700' },

  checkInsCard: {
    marginTop: 6,
    backgroundColor: NEON.slate,
    borderWidth: 1,
    borderColor: '#0f2430',
  },
  checkInsTitle: { fontWeight: '700', color: NEON.cyan, marginBottom: 6 },
  checkInItem: { color: NEON.text, marginBottom: 6 },

  sessionActions: { marginTop: 12, gap: 12 },
  endButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,30,58,0.3)',
    backgroundColor: 'transparent',
  },
  deleteButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,30,58,0.3)',
    backgroundColor: 'transparent',
  },
});
