import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {spawnSync, SpawnSyncReturns} from "child_process";

interface RemarkablePluginSettings {
	nodePath: string;
	md2pdfPath: string;
	rmapiPath: string;
	reMarkableFolder: string | null;
	cleanup: boolean;
	showSidebarIcon: boolean;
	showPopups: boolean;
}

const DEFAULT_SETTINGS: RemarkablePluginSettings = {
	nodePath: '/usr/local/bin/node',
	md2pdfPath: '/usr/local/bin/node/md-to-pdf',
	rmapiPath: '$HOME/go/bin/rmapi',
	reMarkableFolder: null,
	cleanup: true,
	showSidebarIcon: false,
	showPopups: true,
}

const UPLOAD_ACTIVE_ICON = 'cloud-lightning'

export default class RemarkablePlugin extends Plugin {
	settings: RemarkablePluginSettings;
	//@ts-ignore
	vaultDirectory = this.app.vault.adapter.basePath
	sideBarButton: HTMLElement;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'upload-active-to-remarkable',
			name: 'Upload active file to reMarkable',
			icon: UPLOAD_ACTIVE_ICON,
			callback: () => {
				this.uploadActiveFile()
			}
		})

		this.sideBarButton = this.addRibbonIcon(UPLOAD_ACTIVE_ICON, 'Upload current file to reMarkable', async() => {
			await this.uploadActiveFile()
		})


		this.addSettingTab(new RemarkablePluginSettingTab(this.app, this));

	}

	async uploadActiveFile() {
		this.displayMessage("Starting upload to reMarkable")
		const activeFile = this.app.workspace.getActiveFile()
		if (!activeFile) {
			this.displayError("No active editor file.")
			return
		}
		const currentFilePath = activeFile.path.replace(/ /g, "\\ ")
		if (!currentFilePath.endsWith(".md")) {
			this.displayError("Can only upload .md files")
			return
		}
		this.convertToPdf(currentFilePath)
			.then(() => {
				this.uploadToRemarkable(currentFilePath)
					.then(() => {
						this.displayMessage('Upload to reMarkable successful!');
					})
					.catch((e) => {
						this.displayError("Failed to upload to reMarkable." + e)
					})
					.finally(() => {
						if (this.settings.cleanup) {
							this.cleanUp(currentFilePath).catch((e) => this.displayError("Failed to clean up after upload. " + e))
						}
					})
			})
			.catch((e) => {
				this.displayError('Failed to convert to PDF.' + e)
			})
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async convertToPdf(fileName: string) {

		const command = this.settings.nodePath;
		const args = [this.settings.md2pdfPath, `${this.vaultDirectory}/${fileName}`];

		const result = spawnSync(command, args, {shell: true});
		maybeHandleError(result)
	}

	async uploadToRemarkable(fileName: string) {

		const actualFileName = fileName.replace(/\.md$/, '');

		const command = this.settings.rmapiPath;
		const args = ["put", `${this.vaultDirectory}/${actualFileName}.pdf`];
		if (this.settings.reMarkableFolder) {
			args.push(this.settings.reMarkableFolder)
		}

		const result = spawnSync(command, args, {shell: true});

		maybeHandleError(result)
	}

	async cleanUp(fileName: string) {
		const actualFileName = fileName.replace(/\.md$/, '');

		const command = "rm";
		const args = [`${this.vaultDirectory}/${actualFileName}.pdf`];

		const result = spawnSync(command, args, {shell: true});

		maybeHandleError(result)
	}

	displayMessage(message: string, timeout: number = 4 * 1000): void {


		if (this.settings.showPopups) {
			new Notice(message, 5 * 1000);
		}

		console.log(`obsidian-remarkable: ${message}`);
	}
	displayError(message: any, timeout: number = 10 * 1000): void {

		// Some errors might not be of type string
		message = message.toString();
		new Notice(message, timeout);
		console.log(`obsidian-remarkable error: ${message}`);
	}
}

function maybeHandleError(result: SpawnSyncReturns<Buffer>) {
	if (result.error) {
		const error = result.error.message
		console.error("Error: " + error)
		throw Error(error);
	}
	if (result.stderr.length > 0) {
		const error = result.stderr.toString()
		console.error("stderr: " + error)
		throw Error(error);
	}
}

class RemarkablePluginSettingTab extends PluginSettingTab {
	plugin: RemarkablePlugin;

	constructor(app: App, plugin: RemarkablePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings'});

		new Setting(containerEl)
			.setName('reMarkable folder')
			.setDesc('A folder on the reMarkable to upload to. Note that this folder must exist. Can contain "/". Leave empty to use root.')
			.addText(text => text
				.setPlaceholder('A folder on reMarkable')
				.setValue(this.plugin.settings.reMarkableFolder ?? "")
				.onChange(async (value) => {
					if (value === "") {
						this.plugin.settings.reMarkableFolder = null
					} else {
						this.plugin.settings.reMarkableFolder = value;
					}
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Clean up')
			.setDesc('Delete the generated PDF after uploading.')
			.addToggle(value => value
				.setValue(this.plugin.settings.cleanup)
				.onChange(async (v) => {
					this.plugin.settings.cleanup = v;
					await this.plugin.saveSettings()
				})
			)

		new Setting(containerEl)
			.setName('Show sidebar icon')
			.setDesc('Whether to show a sidebar icon.')
			.addToggle(value => value
				.setValue(this.plugin.settings.showSidebarIcon)
				.onChange(async (v) => {
					this.plugin.settings.showSidebarIcon = v;
					await this.plugin.saveSettings()
					v ? this.plugin.sideBarButton.show() : this.plugin.sideBarButton.hide();
				})
			)

		new Setting(containerEl)
			.setName('Show popups')
			.setDesc('Show popup messages.')
			.addToggle(value => value
				.setValue(this.plugin.settings.showPopups)
				.onChange(async (v) => {
					this.plugin.settings.showPopups = v;
					await this.plugin.saveSettings()
				})
			)

		new Setting(containerEl)
			.setName('Node executable path')
			.setDesc('Absolute path to Node on your system, e.g. the output of `which node`')
			.addText(text => text
				.setPlaceholder('Absolute path to Node')
				.setValue(this.plugin.settings.nodePath)
				.onChange(async (value) => {
					this.plugin.settings.nodePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('md-to-pdf executable path')
			.setDesc('Absolute path to md-to-pdf on your system, e.g. the output of `which md-to-pdf`')
			.addText(text => text
				.setPlaceholder('Absolute path to md-to-pdf')
				.setValue(this.plugin.settings.md2pdfPath)
				.onChange(async (value) => {
					this.plugin.settings.md2pdfPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('rmapi executable path')
			.setDesc('Absolute path to rmapi on your system, e.g. the output of `which rmapi`')
			.addText(text => text
				.setPlaceholder('Absolute path to rmapi')
				.setValue(this.plugin.settings.rmapiPath)
				.onChange(async (value) => {
					this.plugin.settings.rmapiPath = value;
					await this.plugin.saveSettings();
				}));

	}
}
