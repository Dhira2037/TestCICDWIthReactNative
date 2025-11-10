import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { getDB } from '../utils/db';
import StyledNavButton from '../components/StyledNavButton';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RoomListScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState([]);
  const [sections, setSections] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRooms = () => {
    const db = getDB();
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM rooms ORDER BY floor, roomNumber', [], (_, { rows }) => {
        const data = [];
        for (let i = 0; i < rows.length; i++) {
          data.push(rows.item(i));
        }
        setRooms(data);
        filterAndGroupRooms(data, searchQuery);
      });
    });
  };

  const filterAndGroupRooms = (roomList, query) => {
    const lower = query.toLowerCase();
    const filtered = roomList.filter(
      r =>
        r.floor.toString().includes(lower) ||
        r.roomNumber.toString().includes(lower) ||
        r.acType.toLowerCase().includes(lower)
    );

    const grouped = {};
    filtered.forEach(room => {
      if (!grouped[room.floor]) grouped[room.floor] = [];
      grouped[room.floor].push(room);
    });

    const sectionData = Object.entries(grouped).map(([floor, data]) => ({
      title: `Floor ${floor}`,
      data,
    }));

    setSections(sectionData);
  };

  const handleDelete = (id) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this room?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const db = getDB();
          db.transaction(tx => {
            tx.executeSql('DELETE FROM rooms WHERE id = ?', [id], () => loadRooms());
          });
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const vacantBeds = item.totalBeds - item.occupiedBeds;
    const isFull = vacantBeds <= 0;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('AddEditRoom', { room: item })}
        style={[
          styles.card,
          isFull ? styles.fullCard : vacantBeds <= 1 ? styles.warningCard : null,
        ]}
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>
              Room {item.roomNumber} ({item.acType})
            </Text>
            <Text style={styles.subtitle}>
              Total: {item.totalBeds} | Occupied: {item.occupiedBeds} | Vacant: {vacantBeds}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Icon name="delete" size={22} color="#cc0000" />
          </TouchableOpacity>
          <Icon name="chevron-right" size={24} color="#888" style={{ marginLeft: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadRooms);
    return unsubscribe;
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <StyledNavButton title="Add" onPress={() => navigation.navigate('AddEditRoom')} />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    filterAndGroupRooms(rooms, searchQuery);
  }, [searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      <View style={styles.searchBox}>
        <Icon name="search" size={20} color="#888" />
        <TextInput
          placeholder="Search by floor, room number, or AC type"
          placeholderTextColor="#888"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginHorizontal: 16,
    marginTop: 8,
    elevation: 2,
    marginBottom:5
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#000000',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    backgroundColor: '#eef2f5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    color: '#333',
    marginTop: 10,
    borderRadius: 6,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 10,
    borderRadius: 12,
    elevation: 2,
  },
  fullCard: {
    backgroundColor: '#ffe6e6',
  },
  warningCard: {
    backgroundColor: '#fff9e6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#555',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default RoomListScreen;
