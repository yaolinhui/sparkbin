import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

interface CustomNavProps {
  title: string;
  showBack?: boolean;
}

export function CustomNav({ title, showBack = false }: CustomNavProps) {
  const handleBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className="custom-nav">
      {showBack && (
        <View className="nav-back" onClick={handleBack}>
          <Text style={{ fontSize: '36rpx', fontWeight: 'bold' }}>←</Text>
        </View>
      )}
      <Text className="nav-title">{title}</Text>
    </View>
  );
}
