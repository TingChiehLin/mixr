import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Searchbar, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const LearnTab = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const substances = [
    {
      id: 1,
      name: 'MDMA',
      description:
        'A stimulant and empathogen that enhances mood and sociability. Often used recreationally in party settings.',
      harmReduction: [
        'Avoid redosing frequently—it increases neurotoxicity risk.',
        'Stay hydrated, but don’t overdrink water.',
        'Take breaks and cool down when dancing.',
      ],
      category: 'Stimulant',
      color: '#FF8A65',
    },
    {
      id: 2,
      name: 'LSD',
      description:
        'A powerful psychedelic that alters perception, mood, and thought patterns.',
      harmReduction: [
        'Ensure a safe, comfortable environment.',
        'Avoid mixing with stimulants.',
        'Have a sober trip sitter present if inexperienced.',
      ],
      category: 'Psychedelic',
      color: '#9575CD',
    },
    {
      id: 3,
      name: 'Ketamine',
      description:
        'A dissociative anesthetic with hallucinogenic and tranquilizing effects.',
      harmReduction: [
        'Avoid combining with depressants like alcohol.',
        'Use in moderation; frequent use may cause bladder issues.',
        'Stay seated or lying down during effects.',
      ],
      category: 'Dissociative',
      color: '#4DD0E1',
    },
    {
      id: 4,
      name: 'Alcohol',
      description: 'A depressant that impairs coordination and judgment.',
      harmReduction: [
        'Eat before drinking.',
        'Avoid mixing with sedatives or stimulants.',
        'Stay hydrated and know your limit.',
      ],
      category: 'Depressant',
      color: '#81C784',
    },
  ];

  const filtered = substances.filter((s) =>
    [s.name, s.category]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: number) => {
    setExpandedCard((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Harm Reduction</Text>

        <Searchbar
          placeholder="Search substances or categories..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
          placeholderTextColor="rgba(255,255,255,0.5)"
          iconColor="#E8F9FF"
        />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {filtered.map((substance) => {
          const isExpanded = expandedCard === substance.id;

          return (
            <View
              key={substance.id}
              style={[styles.card, isExpanded && styles.cardExpanded]}
            >
              <TouchableOpacity
                onPress={() => toggleExpand(substance.id)}
                activeOpacity={0.85}
                style={styles.cardTouchable}
              >
                <Card.Content style={styles.cardContent}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View
                        style={[
                          styles.colorIndicator,
                          { backgroundColor: substance.color },
                        ]}
                      />
                      <View style={styles.titleWrap}>
                        <Text numberOfLines={1} style={styles.substanceName}>
                          {substance.name}
                        </Text>
                        <Text numberOfLines={1} style={styles.substanceMeta}>
                          {substance.category}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.headerRight}>
                      <Chip
                        mode="flat"
                        style={[
                          styles.categoryChip,
                          { borderColor: substance.color },
                        ]}
                        textStyle={styles.chipText}
                      >
                        {substance.category}
                      </Chip>

                      <MaterialCommunityIcons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color="#E8F9FF"
                      />
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={styles.description}>
                    {substance.description}
                  </Text>

                  {/* Expanded Harm Reduction Section */}
                  {isExpanded && (
                    <View style={styles.harmReductionSection}>
                      <Text style={styles.harmReductionTitle}>
                        Harm Reduction Tips
                      </Text>
                      {substance.harmReduction.map((tip, i) => (
                        <View key={i} style={styles.tipContainer}>
                          <Text
                            style={[styles.bullet, { color: substance.color }]}
                          >
                            •
                          </Text>
                          <Text style={styles.tip}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <Text style={styles.expandText}>
                    {isExpanded
                      ? 'Tap to collapse'
                      : 'Tap for harm reduction tips'}
                  </Text>
                </Card.Content>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Empty Result */}
        {filtered.length === 0 && (
          <Card style={[styles.card, styles.emptyCard]}>
            <Card.Content>
              <Text style={styles.emptyText}>
                No results found. Try another search.
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Disclaimer */}
        <Card style={[styles.card, styles.disclaimerCard]}>
          <Card.Content>
            <Text style={styles.disclaimerTitle}>Important Notice</Text>
            <Text style={styles.disclaimerText}>
              This information is for harm reduction purposes only and is not
              medical advice. The safest option is not to use drugs. If you're
              in an emergency, call local emergency services.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 6,
    flex: 1,
    backgroundColor: '#0B1221', // modern navy background
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    marginTop: 52,
    marginBottom: 10,
    fontWeight: '800',
    color: '#E8F9FF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontSize: 16,
  },
  searchbar: {
    elevation: 0,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 16,
    color: '#E8F9FF',
    paddingBottom: 14,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 60,
  },
  card: {
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardExpanded: {
    shadowColor: '#00BCD4',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    transform: [{ scale: 1.01 }],
    borderColor: 'rgba(0,188,212,0.3)',
  },
  cardTouchable: { width: '100%' },
  cardContent: { paddingVertical: 12, paddingHorizontal: 14 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  titleWrap: { flexDirection: 'column', minWidth: 0 },
  colorIndicator: { width: 12, height: 12, borderRadius: 3, marginRight: 12 },
  substanceName: {
    fontWeight: '800',
    color: '#E8F9FF',
    fontSize: 16,
    flexShrink: 1,
  },
  substanceMeta: { marginTop: 2, fontSize: 11, color: '#9AB4C2' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  categoryChip: {
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginRight: 8,
  },
  chipText: { color: '#82E9DE', fontWeight: '700', fontSize: 12 },
  description: { marginBottom: 10, color: '#A6C5D8', lineHeight: 20 },
  harmReductionSection: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  harmReductionTitle: {
    fontWeight: '800',
    marginBottom: 8,
    color: '#4DD0E1',
    fontSize: 14,
  },
  tipContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
    alignItems: 'flex-start',
  },
  bullet: { marginRight: 10, fontSize: 16, lineHeight: 20 },
  tip: { flex: 1, lineHeight: 20, color: '#E8F9FF' },
  expandText: {
    marginTop: 8,
    color: '#82E9DE',
    fontStyle: 'italic',
    fontSize: 12,
  },
  emptyCard: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  emptyText: { textAlign: 'center', color: '#7A8F8A' },
  disclaimerCard: {
    marginTop: 8,
    backgroundColor: 'rgba(77,208,225,0.05)',
    borderColor: 'rgba(77,208,225,0.1)',
  },
  disclaimerTitle: {
    fontWeight: '800',
    marginBottom: 8,
    color: '#82E9DE',
  },
  disclaimerText: { color: '#A6C5D8', marginBottom: 8 },
});

export default LearnTab;
