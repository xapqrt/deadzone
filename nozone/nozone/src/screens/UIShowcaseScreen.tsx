import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import {
  Layout,
  Stack,
  Row,
  Button,
  Input,
  Card,
  Toast,
  Modal,
  Avatar,
  AvatarGroup,
  Spacer,
  Divider,
  Center,
  showToast,
} from '../components/ui';
import { BackButton } from '../components/BackButton';
import { theme, typography } from '../utils/theme';
import { BrandTitle } from '../components/BrandTitle';

interface UIShowcaseScreenProps {
  onBack: () => void;
}

export const UIShowcaseScreen: React.FC<UIShowcaseScreenProps> = ({ onBack }) => {
  const [inputValue, setInputValue] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const sampleAvatars = [
    { id: '1', name: 'John Doe' },
    { id: '2', name: 'Jane Smith' },
    { id: '3', name: 'Alice Johnson' },
    { id: '4', name: 'Bob Wilson' },
    { id: '5', name: 'Carol Brown' },
  ];

  return (
    <Layout variant="screen" safe scrollable>
      <Stack spacing="lg" style={{ padding: theme.spacing.md }}>
        {/* Header with Back Button */}
        <Row align="center" spacing="md">
          <BackButton onPress={onBack} />
          <View style={{ flex: 1, alignItems:'flex-start' }}>
            <BrandTitle size="sm" />
          </View>
        </Row>
        
        <Card>
          <Text style={styles.sectionDescription}>
            A comprehensive collection of modern, accessible UI components for DEADZONE.
          </Text>
        </Card>

        {/* Buttons */}
        <Card title="Buttons" variant="outlined">
          <Stack spacing="md">
            <Row spacing="sm" wrap>
              <Button title="Primary" onPress={() => showToast.success('Primary button pressed!')} />
              <Button title="Secondary" variant="secondary" onPress={() => showToast.info('Secondary button!')} />
              <Button title="Outline" variant="outline" onPress={() => showToast.info('Outline button!')} />
            </Row>
            
            <Row spacing="sm" wrap>
              <Button title="Ghost" variant="ghost" onPress={() => showToast.info('Ghost button!')} />
              <Button title="Success" variant="success" onPress={() => showToast.success('Success!')} />
              <Button title="Destructive" variant="destructive" onPress={() => showToast.error('Destructive action!')} />
            </Row>

            <Row spacing="sm" wrap>
              <Button title="Small" size="sm" onPress={() => showToast.info('Small button!')} />
              <Button title="Medium" size="md" onPress={() => showToast.info('Medium button!')} />
              <Button title="Large" size="lg" onPress={() => showToast.info('Large button!')} />
            </Row>

            <Row spacing="sm" wrap>
              <Button 
                title="With Icon" 
                icon="star" 
                onPress={() => showToast.info('Icon button!')} 
              />
              <Button 
                title="Loading" 
                loading 
                onPress={() => {}} 
              />
              <Button 
                title="Disabled" 
                disabled 
                onPress={() => {}} 
              />
            </Row>

            <Button 
              title="Full Width Button" 
              fullWidth 
              onPress={() => showToast.info('Full width button!')} 
            />
          </Stack>
        </Card>

        {/* Inputs */}
        <Card title="Input Fields" variant="outlined">
          <Stack spacing="md">
            <Input
              label="Basic Input"
              placeholder="Enter some text..."
              value={inputValue}
              onChangeText={setInputValue}
            />

            <Input
              label="Email Address"
              placeholder="user@example.com"
              value=""
              onChangeText={() => {}}
              leftIcon="mail"
              clearable
            />

            <Input
              label="Password"
              placeholder="Enter password"
              value=""
              onChangeText={() => {}}
              secure
              required
            />

            <Input
              label="Search"
              placeholder="Search messages..."
              value=""
              onChangeText={() => {}}
              leftIcon="search"
              variant="ghost"
            />

            <Input
              label="Message"
              placeholder="Type your message..."
              value=""
              onChangeText={() => {}}
              multiline
              maxLength={280}
              showCharacterCount
            />

            <Input
              label="Error Example"
              placeholder="This field has an error"
              value=""
              onChangeText={() => {}}
              error="This field is required"
            />
          </Stack>
        </Card>

        {/* Cards */}
        <Card title="Card Variations" variant="outlined">
          <Stack spacing="md">
            <Card
              title="Simple Card"
              description="This is a basic card with title and description."
              variant="elevated"
            />

            <Card
              title="Card with Actions"
              subtitle="Interactive card example"
              description="This card has header and footer actions."
              leftIcon="message-circle"
              rightIcon="more-horizontal"
              headerActions={
                <Button title="Action" size="sm" variant="ghost" onPress={() => showToast.info('Header action!')} />
              }
              footerActions={
                <Row spacing="sm">
                  <Button title="Cancel" size="sm" variant="outline" onPress={() => showToast.info('Cancel!')} />
                  <Button title="Save" size="sm" onPress={() => showToast.success('Saved!')} />
                </Row>
              }
            />

            <Card
              title="Clickable Card"
              description="This card can be pressed and has haptic feedback."
              onPress={() => showToast.info('Card pressed!')}
              badge="New"
            />

            <Card
              title="Ghost Card"
              description="This card has no background or shadows."
              variant="ghost"
            />
          </Stack>
        </Card>

        {/* Avatars */}
        <Card title="Avatars" variant="outlined">
          <Stack spacing="md">
            <View>
              <Text style={styles.subsectionTitle}>Sizes</Text>
              <Row spacing="sm" align="center">
                <Avatar name="XS" size="xs" />
                <Avatar name="SM" size="sm" />
                <Avatar name="MD" size="md" />
                <Avatar name="LG" size="lg" />
                <Avatar name="XL" size="xl" />
                <Avatar name="2XL" size="2xl" />
              </Row>
            </View>

            <View>
              <Text style={styles.subsectionTitle}>Variants</Text>
              <Row spacing="sm" align="center">
                <Avatar name="Circle" variant="circle" />
                <Avatar name="Rounded" variant="rounded" />
                <Avatar name="Square" variant="square" />
              </Row>
            </View>

            <View>
              <Text style={styles.subsectionTitle}>Status Indicators</Text>
              <Row spacing="sm" align="center">
                <Avatar name="Online" status="online" />
                <Avatar name="Away" status="away" />
                <Avatar name="Busy" status="busy" />
                <Avatar name="Offline" status="offline" />
              </Row>
            </View>

            <View>
              <Text style={styles.subsectionTitle}>Avatar Group</Text>
              <AvatarGroup
                avatars={sampleAvatars}
                max={4}
                onPress={(id) => showToast.info(`Avatar ${id} pressed`)}
                onMorePress={() => showToast.info('Show more avatars')}
              />
            </View>
          </Stack>
        </Card>

        {/* Modals and Toasts */}
        <Card title="Modals & Toasts" variant="outlined">
          <Stack spacing="md">
            <Row spacing="sm" wrap>
              <Button
                title="Show Modal"
                onPress={() => setModalVisible(true)}
              />
              <Button
                title="Show Toast"
                variant="secondary"
                onPress={() => setToastVisible(true)}
              />
            </Row>

            <Row spacing="sm" wrap>
              <Button
                title="Success Toast"
                variant="success"
                onPress={() => showToast.success('Operation completed successfully!')}
              />
              <Button
                title="Error Toast"
                variant="destructive"
                onPress={() => showToast.error('Something went wrong!')}
              />
            </Row>

            <Row spacing="sm" wrap>
              <Button
                title="Warning Toast"
                onPress={() => showToast.warning('Please check your input!')}
              />
              <Button
                title="Info Toast"
                variant="ghost"
                onPress={() => showToast.info('This is an information message.')}
              />
            </Row>
          </Stack>
        </Card>

        {/* Layout Components */}
        <Card title="Layout Components" variant="outlined">
          <Stack spacing="md">
            <View>
              <Text style={styles.subsectionTitle}>Stack (Vertical)</Text>
              <Stack spacing="sm" style={styles.demoContainer}>
                <View style={styles.demoBox} />
                <View style={styles.demoBox} />
                <View style={styles.demoBox} />
              </Stack>
            </View>

            <View>
              <Text style={styles.subsectionTitle}>Row (Horizontal)</Text>
              <Row spacing="sm" style={styles.demoContainer}>
                <View style={styles.demoBox} />
                <View style={styles.demoBox} />
                <View style={styles.demoBox} />
              </Row>
            </View>

            <View>
              <Text style={styles.subsectionTitle}>Center</Text>
              <Center style={{...styles.demoContainer, height: 80 }}>
                <View style={styles.demoBox} />
              </Center>
            </View>

            <View>
              <Text style={styles.subsectionTitle}>Divider</Text>
              <View style={styles.demoContainer}>
                <Text>Content above</Text>
                <Spacer size="sm" />
                <Divider />
                <Spacer size="sm" />
                <Text>Content below</Text>
              </View>
            </View>
          </Stack>
        </Card>

        {/* Final spacer */}
        <Spacer size="xl" />
      </Stack>

      {/* Modal */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Example Modal"
        description="This is a demonstration of the modal component with customizable actions."
        actions={[
          {
            label: 'Cancel',
            onPress: () => setModalVisible(false),
            variant: 'outline',
          },
          {
            label: 'Confirm',
            onPress: () => {
              setModalVisible(false);
              showToast.success('Action confirmed!');
            },
            variant: 'primary',
          },
        ]}
      />

      {/* Toast */}
      {toastVisible && (
        <Toast
          message="This is a custom toast message!"
          type="info"
          visible={toastVisible}
          onHide={() => setToastVisible(false)}
        />
      )}
    </Layout>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 24,
    fontFamily: typography.fonts.bold,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
  },
  sectionDescription: {
    fontSize: 16,
    fontFamily: typography.fonts.regular,
    color: theme.colors.textMuted,
    lineHeight: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontFamily: typography.fonts.medium,
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
  },
  demoContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  demoBox: {
    width: 40,
    height: 40,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.sm,
  },
});
