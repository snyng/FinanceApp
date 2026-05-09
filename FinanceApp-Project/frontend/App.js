import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';

const API_URL = 'https://after17--975d476c4b9611f18493ee650bb23af1.web.val.run'; 

export default function App() {
  const [data, setData] = useState({ records: [], stats: { income: 0, expense: 0 } });
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // 表单状态
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  // 初始化加载
  useEffect(() => { fetchFinanceData(); }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('网络异常');
      const json = await res.json();
      setData(json);
    } catch (error) {
      Alert.alert("同步失败", error.message);
    } finally {
      setLoading(false);
    }
  };

  const submitRecord = async () => {
    if (!amount || !category) return Alert.alert("提示", "请填写金额和分类");
    if (isNaN(amount)) return Alert.alert("提示", "金额必须是数字");

    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount, category, note }),
      });
      
      if (!res.ok) {
        const errJson = await res.json();
        Alert.alert("后端报错了", errJson.error || "未知错误");
        return;
      }

      setAmount(''); setCategory(''); setNote('');
      setModalVisible(false);
      fetchFinanceData(); // 重新拉取数据
    } catch (e) { 
      Alert.alert("网络错误", "请求发送失败"); 
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (id) => {
    Alert.alert("删除", "确定要删除这条记录吗？", [
      { text: "取消", style: "cancel" },
      { text: "确定", style: "destructive", onPress: async () => {
          await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
          fetchFinanceData();
      }}
    ]);
  };

  // 渲染单条记录
  const renderItem = ({ item }) => {
    const isIncome = item.type === 'income';
    return (
      <View style={styles.recordCard}>
        <View style={styles.recordLeft}>
          <Text style={styles.categoryIcon}>{isIncome ? '💰' : '🛒'}</Text>
          <View>
            <Text style={styles.recordCategory}>{item.category}</Text>
            <Text style={styles.recordNote}>{item.note || '无备注'}</Text>
          </View>
        </View>
        <View style={styles.recordRight}>
          <Text style={[styles.recordAmount, { color: isIncome ? '#4CAF50' : '#F44336' }]}>
            {isIncome ? '+' : '-'}{item.amount}
          </Text>
          <TouchableOpacity onPress={() => deleteRecord(item.id)}>
            <Text style={styles.deleteBtn}>删</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const balance = (data.stats.income - data.stats.expense).toFixed(2);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部数据看板 */}
      <View style={styles.dashboard}>
        <Text style={styles.dashboardTitle}>当月结余 (元)</Text>
        <Text style={styles.balanceText}>{balance}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>总收入</Text>
            <Text style={styles.statIncome}>+{data.stats.income.toFixed(2)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>总支出</Text>
            <Text style={styles.statExpense}>-{data.stats.expense.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      {/* 账单列表 */}
      <Text style={styles.listTitle}>最近收支明细</Text>
      {loading && !data.records.length ? (
        <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 50}}/>
      ) : (
        <FlatList
          data={data.records}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* 悬浮添加按钮 (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* 底部滑出的添加记录模态层 */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>记一笔</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtn}>关闭</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.typeSelector}>
              <TouchableOpacity style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveOut]} onPress={() => setType('expense')}>
                <Text style={type === 'expense' ? styles.typeTextActive : styles.typeText}>支出</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIn]} onPress={() => setType('income')}>
                <Text style={type === 'income' ? styles.typeTextActive : styles.typeText}>收入</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="金额 (如: 50.5)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.input} placeholder="分类 (如: 餐饮、工资)" value={category} onChangeText={setCategory} />
            <TextInput style={styles.input} placeholder="备注 (可选)" value={note} onChangeText={setNote} />

            <TouchableOpacity style={styles.submitBtn} onPress={submitRecord}>
              <Text style={styles.submitBtnText}>保存记录</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  dashboard: { backgroundColor: '#007AFF', padding: 25, paddingTop: 60, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowColor: '#007AFF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  dashboardTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  balanceText: { color: '#FFF', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statBox: { alignItems: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 5 },
  statIncome: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  statExpense: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  listTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 20, marginTop: 20, marginBottom: 10 },
  recordCard: { backgroundColor: '#FFF', marginHorizontal: 15, marginBottom: 10, padding: 15, borderRadius: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordLeft: { flexDirection: 'row', alignItems: 'center' },
  categoryIcon: { fontSize: 24, marginRight: 15 },
  recordCategory: { fontSize: 16, color: '#333', fontWeight: '500' },
  recordNote: { fontSize: 12, color: '#999', marginTop: 4 },
  recordRight: { flexDirection: 'row', alignItems: 'center' },
  recordAmount: { fontSize: 18, fontWeight: 'bold', marginRight: 15 },
  deleteBtn: { color: '#FF3B30', fontSize: 14, backgroundColor: '#FFECEB', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  fab: { position: 'absolute', right: 20, bottom: 40, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: {width: 0, height: 4}, elevation: 5 },
  fabIcon: { color: '#FFF', fontSize: 32, fontWeight: '300', marginTop: -4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { fontSize: 16, color: '#007AFF' },
  typeSelector: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA', backgroundColor: '#F2F2F7' },
  typeBtnActiveOut: { backgroundColor: '#F44336', borderColor: '#F44336' },
  typeBtnActiveIn: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  typeText: { color: '#666', fontWeight: 'bold' },
  typeTextActive: { color: '#FFF', fontWeight: 'bold' },
  input: { backgroundColor: '#F2F2F7', padding: 15, borderRadius: 10, marginBottom: 15, fontSize: 16 },
  submitBtn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});