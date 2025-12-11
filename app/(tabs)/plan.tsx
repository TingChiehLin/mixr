import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  SegmentedButtons,
  Text,
  useTheme,
  Card,
  IconButton,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Dropdown } from 'react-native-element-dropdown';

type StatusKey = 'UNSAFE' | 'DANGEROUS' | 'CAUTION' | 'SAFE' | 'UNKNOWN';

/* --------- EDGY COLOR PALETTE (neon on charcoal) --------- */
const NEON = {
  magenta: '#FF2D95', // primary CTA
  teal: '#00F5A0', // safe
  cyan: '#39D2FF',
  amber: '#FFC857', // caution
  orange: '#FF6B35', // dangerous
  red: '#FF1E3A', // unsafe
  slate: '#0B1220', // card surface
  charcoal: '#071018', // app bg
  muted: '#7B8790', // placeholders
  text: '#E6F6F5',
};

const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; description?: string }
> = {
  UNSAFE: { label: 'Unsafe', color: NEON.red }, // hot red
  DANGEROUS: { label: 'Dangerous', color: NEON.orange }, // orange-red
  CAUTION: { label: 'Caution', color: NEON.amber }, // amber
  SAFE: { label: 'Safe', color: NEON.teal }, // neon green/teal
  UNKNOWN: { label: 'Unknown', color: '#f7f7f7' }, // neutral slate
};

const INTERACTION_MATRIX: Record<string, StatusKey> = {
  'ALCOHOL+KETAMINE': 'DANGEROUS',
  'ALCOHOL+MDMA': 'CAUTION',
  'ALCOHOL+COCAINE': 'UNSAFE',
  'KETAMINE+MDMA': 'SAFE',
  'KETAMINE+COCAINE': 'CAUTION',
  'MDMA+COCAINE': 'CAUTION',
  'COCAINE+KETAMINE': 'CAUTION',
  'COCAINE+MDMA': 'CAUTION',
  'COCAINE+ALCOHOL': 'UNSAFE',
};

const EXPLANATIONS: Record<
  string,
  { heading: string; sections: { title?: string; lines: string[] }[] }
> = {
  'ALCOHOL+MDMA': {
    heading: 'Alcohol + MDMA — Caution',
    sections: [
      {
        title: '⚖️ 1. Opposing Effects on the Body',
        lines: [
          'MDMA is a stimulant that raises energy and heart rate.',
          'Alcohol is a depressant that slows the nervous system.',
          'When taken together, they mask each other’s effects, often leading to heavier use and increased overdose risk.',
        ],
      },
      {
        title: '❤️ 2. Dehydration and Overheating',
        lines: [
          'Both drugs dehydrate the body and raise core temperature.',
          'The mix heightens the chance of overheating, fainting, or organ failure, especially in hot or crowded spaces.',
        ],
      },
      {
        title: '🧠 3. Cognitive and Emotional Strain',
        lines: [
          'Mixing blurs awareness, increasing confusion, anxiety, and impulsivity.',
          'Users may not recognize when their body is in distress or when they need to stop.',
        ],
      },
      {
        title: '🩸 4. Stress on the Heart, Liver, and Kidneys',
        lines: [
          'Both substances are processed by the liver, amplifying toxicity.',
          'The heart works harder, risking arrhythmias or collapse.',
          'The kidneys struggle to manage hydration, risking low blood sodium (hyponatremia).',
        ],
      },
      {
        title: '😞 5. Extended Crash',
        lines: [
          'MDMA depletes serotonin, and alcohol slows recovery.',
          'The combined crash is heavier — low mood, fatigue, and anxiety.',
          'Avoid combining to prevent severe physical and emotional strain.',
        ],
      },
    ],
  },
  'ALCOHOL+COCAINE': {
    heading: 'Alcohol + Cocaine — Unsafe',
    sections: [
      {
        title: '⚗️ 1. Toxic Chemical Formation',
        lines: [
          'When used together, the body forms cocaethylene, a highly toxic compound.',
          'It stays in the bloodstream longer and stresses the heart and liver.',
        ],
      },
      {
        title: '❤️ 2. Cardiac and Liver Stress',
        lines: [
          'Cocaethylene increases heart rate and blood pressure dramatically.',
          'Chance of cardiac arrest, stroke, and long-term liver damage rises.',
        ],
      },
      {
        title: '🧠 3. Masked Intoxication',
        lines: [
          'Alcohol dulls sensations while cocaine creates alertness.',
          'Users often drink or snort more, unaware of their actual intoxication level.',
        ],
      },
      {
        title: '💥 4. Emotional Volatility',
        lines: [
          'The mix heightens impulsivity, aggression, and poor decision-making.',
          'Sudden mood swings or violence are more likely.',
        ],
      },
      {
        title: '🚫 5. Risk Summary',
        lines: [
          'This combination is toxic and unpredictable.',
          'Even small doses can cause lasting harm — avoid completely.',
        ],
      },
    ],
  },
  'ALCOHOL+KETAMINE': {
    heading: 'Ketamine + Alcohol — Dangerous',
    sections: [
      {
        title: '💫 1. Combined Sedation',
        lines: [
          'Both depress the central nervous system, slowing reflexes and breathing.',
          'Loss of coordination and awareness can happen suddenly.',
        ],
      },
      {
        title: '🫁 2. Respiratory and Consciousness Risks',
        lines: [
          'The mix increases the likelihood of vomiting while semi-conscious.',
          'There’s a danger of choking or respiratory failure.',
        ],
      },
      {
        title: '🧠 3. Cognitive Blackouts',
        lines: [
          'Users often experience memory loss or complete blackouts.',
          'The brain’s oxygen supply can drop, causing disorientation or panic.',
        ],
      },
      {
        title: '💔 4. Physical Stress',
        lines: [
          'Both substances tax the liver and heart, prolonging recovery.',
          'Fatigue, nausea, and confusion can persist for hours.',
        ],
      },
      {
        title: '🚫 5. Risk Summary',
        lines: [
          'This combination is medically dangerous. Do not mix — it can be fatal.',
        ],
      },
    ],
  },
  'KETAMINE+MDMA': {
    heading: 'Ketamine + MDMA — Lower risk (use with care)',
    sections: [
      {
        title: '⚖️ 1. Balancing Opposites',
        lines: [
          'MDMA is stimulating; Ketamine is dissociative.',
          'Together they can produce euphoria with detachment, but effects shift quickly.',
        ],
      },
      {
        title: '💫 2. Perceptual Changes',
        lines: [
          'The mix alters depth perception and balance; users may feel dreamy but physically unstable.',
        ],
      },
      {
        title: '🧠 3. Emotional Variability',
        lines: [
          'MDMA’s emotional openness can meet Ketamine’s detachment, causing swings between connection and confusion.',
        ],
      },
      {
        title: '💧 4. Hydration and Dosing',
        lines: [
          'Both impact hydration and body temperature.',
          'Use low doses, sip water, and rest often.',
        ],
      },
      {
        title: '✅ 5. Safer Use Summary',
        lines: [
          'Generally lower-risk but still unpredictable. Have trusted people nearby.',
        ],
      },
    ],
  },
  'COCAINE+KETAMINE': {
    heading: 'Ketamine + Cocaine — Caution',
    sections: [
      {
        title: '⚡ 1. Conflicting Body Signals',
        lines: [
          'Cocaine speeds up the body, while Ketamine slows it down.',
          'The body struggles to regulate heart rhythm and pressure.',
        ],
      },
      {
        title: '💥 2. Cardiovascular Stress',
        lines: [
          'Sudden spikes in heart rate and blood pressure are common.',
          'Users may feel stimulated yet clumsy or detached.',
        ],
      },
      {
        title: '🧠 3. Anxiety and Panic',
        lines: [
          'The combination can heighten anxiety or cause dissociative panic.',
        ],
      },
      {
        title: '⚖️ 4. Impaired Coordination',
        lines: [
          'Physical balance and reaction time drop — accidents are more likely.',
        ],
      },
      {
        title: '⚠️ 5. Risk Summary',
        lines: [
          'Avoid frequent mixing. Monitor heart rate and take long breaks.',
        ],
      },
    ],
  },
  'COCAINE+MDMA': {
    heading: 'MDMA + Cocaine — Caution',
    sections: [
      {
        title: '⚡ 1. Dual Stimulation',
        lines: [
          'Both rapidly increase heart rate and blood pressure.',
          'This combination doubles strain on the cardiovascular system.',
        ],
      },
      {
        title: '💥 2. Overheating and Dehydration',
        lines: [
          'The body overheats faster, especially during physical activity.',
          'Water loss and fatigue accumulate quickly.',
        ],
      },
      {
        title: '🧠 3. Mental and Emotional Overload',
        lines: [
          'Euphoria may flip to sharp anxiety or paranoia; crash is longer and more intense.',
        ],
      },
      {
        title: '❤️ 4. Heart Strain',
        lines: [
          'Risk of arrhythmia or cardiac distress increases significantly.',
        ],
      },
      {
        title: '⚠️ 5. Risk Summary',
        lines: ['Avoid combining or limit to very small doses spaced apart.'],
      },
    ],
  },
  DEFAULT: {
    heading: 'Combination information',
    sections: [
      {
        title: undefined,
        lines: [
          'No specific evidence summary available for this exact pair in the matrix provided.',
          'When mixing substances, risks can increase unpredictably.',
          'If unsure, avoid mixing and consult harm-reduction resources or medical professionals.',
        ],
      },
    ],
  },
};

export default function PlanTab() {
  const router = useRouter();
  const theme = useTheme();

  const [primary, setPrimary] = useState('');
  const [secondary, setSecondary] = useState('');
  const [location, setLocation] = useState('');
  const [mode, setMode] = useState('Solo');

  const substanceList = [
    { label: 'Alcohol', value: 'ALCOHOL' },
    { label: 'MDMA', value: 'MDMA' },
    { label: 'LSD', value: 'LSD' },
    { label: 'Ketamine', value: 'KETAMINE' },
    { label: 'Cannabis', value: 'CANNABIS' },
    { label: 'Cocaine', value: 'COCAINE' },
  ];

  const getComboKey = (a: string, b: string) => {
    if (!a && !b) return '';
    if (!a) return a;
    if (!b) return b;
    const pair = [a.toUpperCase(), b.toUpperCase()].sort();
    return `${pair[0]}+${pair[1]}`;
  };

  const comboKey = getComboKey(primary, secondary);
  const interactionStatus: StatusKey =
    (comboKey && INTERACTION_MATRIX[comboKey]) || 'UNKNOWN';
  const statusMeta = STATUS_META[interactionStatus];

  const renderExplanation = (key: string) => {
    const data = EXPLANATIONS[key] || EXPLANATIONS.DEFAULT;
    return (
      <View style={styles.explanation}>
        <Text variant="titleMedium" style={styles.explainHeading}>
          {data.heading}
        </Text>
        {data.sections.map((sec, idx) => (
          <View key={idx} style={styles.explainSection}>
            {sec.title ? (
              <Text style={styles.explainSectionTitle}>{sec.title}</Text>
            ) : null}
            {sec.lines.map((line, i) => (
              <View key={i} style={styles.explainLine}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.explainText}>{line}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const handleCreatePlan = async () => {
    if (!primary.trim() || !secondary.trim() || !location.trim()) {
      Alert.alert(
        'Error',
        'Please select both substances and fill in the location'
      );
      return;
    }

    const session = {
      id: Date.now().toString(),
      primary,
      secondary,
      location,
      mode,
      createdAt: new Date().toISOString(),
      status: 'planned',
      combo: comboKey,
      interactionStatus,
    };

    try {
      const existingSessions = await AsyncStorage.getItem('sessions');
      const sessions = existingSessions ? JSON.parse(existingSessions) : [];
      sessions.push(session);
      await AsyncStorage.setItem('sessions', JSON.stringify(sessions));

      setPrimary('');
      setSecondary('');
      setLocation('');
      setMode('Solo');

      Alert.alert('Success', 'Session plan created');
      router.push('/(tabs)/log');
    } catch (error) {
      Alert.alert('Error', 'Failed to save session');
    }
  };

  const statusIcon =
    interactionStatus === 'UNSAFE'
      ? 'alert-circle'
      : interactionStatus === 'DANGEROUS'
      ? 'alert'
      : interactionStatus === 'CAUTION'
      ? 'alert-outline'
      : 'check-circle-outline';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text variant="headlineMedium" style={styles.title}>
          Plan Your Next Session
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Select substances to check interaction risk, then set your plan.
        </Text>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleSmall" style={styles.label}>
              Primary Substance
            </Text>
            <Dropdown
              data={substanceList}
              labelField="label"
              valueField="value"
              placeholder="Select primary"
              value={primary}
              onChange={(item) => setPrimary(item.value)}
              style={styles.dropdown}
              placeholderStyle={styles.placeholder}
              selectedTextStyle={styles.selectedText}
              containerStyle={styles.dropdownContainer}
            />

            <Text variant="titleSmall" style={styles.label}>
              Secondary Substance
            </Text>
            <Dropdown
              data={substanceList}
              labelField="label"
              valueField="value"
              placeholder="Select secondary"
              value={secondary}
              onChange={(item) => setSecondary(item.value)}
              style={styles.dropdown}
              placeholderStyle={styles.placeholder}
              selectedTextStyle={styles.selectedText}
              containerStyle={styles.dropdownContainer}
            />

            <View style={styles.statusRow}>
              <Text
                variant="labelLarge"
                style={[styles.statusText, { color: styles.label.color }]}
              >
                {statusMeta.label}
              </Text>

              <View style={styles.iconBlock}>
                <IconButton
                  icon={statusIcon}
                  size={20}
                  iconColor={statusMeta.color}
                  style={styles.iconButton}
                />
                <View
                  style={[
                    styles.colorCube,
                    { backgroundColor: statusMeta.color },
                  ]}
                />
              </View>
            </View>

            {comboKey ? renderExplanation(comboKey) : null}

            <TextInput
              label="Location"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Home, Friend's place, Festival"
              left={<TextInput.Icon icon="map-marker-outline" />}
              placeholderTextColor={NEON.muted}
            />

            <Text variant="titleSmall" style={styles.label}>
              Mode
            </Text>
            <SegmentedButtons
              value={mode}
              onValueChange={setMode}
              buttons={[
                { value: 'Solo', label: 'Solo' },
                { value: 'Duo', label: 'Duo' },
                { value: 'Group', label: 'Group' },
              ]}
              style={styles.segmented}
            />

            <Button
              mode="contained"
              onPress={handleCreatePlan}
              style={[styles.button, { backgroundColor: NEON.magenta }]}
              contentStyle={styles.buttonContent}
              textColor="white"
            >
              Create Plan
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NEON.charcoal,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    marginTop: 5,
    fontWeight: '800',
    color: NEON.cyan,
    letterSpacing: 0.3,
  },
  subtitle: {
    marginBottom: 18,
    color: '#9fb7b6',
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: NEON.slate,
    borderWidth: 1,
    borderColor: '#0f2430',
    marginBottom: 14,
    shadowColor: NEON.cyan,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  dropdown: {
    borderColor: '#ffffff',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    justifyContent: 'center',
    backgroundColor: '#071521',
    marginBottom: 12,
  },
  placeholder: {
    color: NEON.muted,
  },
  selectedText: {
    color: NEON.text,
  },
  dropdownContainer: {
    borderRadius: 12,
    marginBottom: 6,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#071521',
    color: NEON.text,
  },
  label: {
    marginBottom: 6,
    marginTop: 4,
    color: '#A9E9FF',
    fontWeight: '700',
  },
  segmented: {
    marginBottom: 36,
    alignSelf: 'flex-start',
    marginTop: 24,
  },
  button: {
    borderRadius: 12,
    marginTop: 6,
  },
  buttonContent: {
    paddingVertical: 10,
  },

  /* status */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    justifyContent: 'flex-start',
  },
  statusText: {
    fontWeight: '800',
    fontSize: 16,
  },
  iconBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    margin: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  colorCube: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0b0b0b',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },

  /* explanation */
  explanation: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#0b2230',
  },
  explainHeading: {
    fontWeight: '800',
    marginBottom: 8,
    color: NEON.cyan,
  },
  explainSection: {
    marginBottom: 10,
  },
  explainSectionTitle: {
    fontWeight: '700',
    marginBottom: 6,
    color: NEON.teal,
  },
  explainLine: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  explainText: {
    flex: 1,
    lineHeight: 20,
    color: '#BFECE6',
  },
  bullet: {
    marginRight: 10,
    fontSize: 14,
    color: NEON.magenta,
  },
});
