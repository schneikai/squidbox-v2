import BlueskyFeature from '@/features/platforms/BlueskyFeature';
import JFFFeature from '@/features/platforms/JFFFeature';
import OnlyFansFeature from '@/features/platforms/OnlyFansFeature';
import TwitterFeature from '@/features/platforms/TwitterFeature';
import { Text, useTheme } from '@rneui/themed';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlatformsPage() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // The actual refresh will be handled by each platform card
    // We just need to trigger a re-render to show loading states
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000); // Give more time for actual data refresh
  }, []);


  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top + 16,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      <Text h3 style={[styles.title, { color: theme.colors.black }]}>
        Social Media Platforms
      </Text>
      
      <View style={styles.subtitleContainer}>
        {isRefreshing && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.loadingIndicator}
          />
        )}
        <Text style={[styles.subtitle, { color: theme.colors.grey2 }]}>
          {isRefreshing
            ? 'Refreshing connections...'
            : 'Connect your social media accounts to start posting'}
        </Text>
      </View>

      <TwitterFeature
        isRefreshing={isRefreshing}
      />
      <BlueskyFeature
        isRefreshing={isRefreshing}
      />
      <OnlyFansFeature
        isRefreshing={isRefreshing}
      />
      <JFFFeature
        isRefreshing={isRefreshing}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
});
