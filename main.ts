import {App, Notice, Plugin, PluginSettingTab, Setting} from 'obsidian';
import {spawnSync, SpawnSyncReturns} from "child_process";

interface RemarkablePluginSettings {
	nodePath: string;
	md2pdfPath: string;
	rmapiPath: string;
	cleanup: boolean,
}

const DEFAULT_SETTINGS: RemarkablePluginSettings = {
	nodePath: '/usr/local/bin/node',
	md2pdfPath: '/usr/local/bin/node/md-to-pdf',
	rmapiPath: '$HOME/go/bin/rmapi',
	cleanup: true,

}

export default class RemarkablePlugin extends Plugin {
	settings: RemarkablePluginSettings;
	//@ts-ignore
	vaultDirectory = this.app.vault.adapter.basePath

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('cloud-lightning', 'Upload current file to reMarkable', () => {
			const currentFilePath = this.app.workspace.activeEditor?.file?.path
			if (!currentFilePath) {
				new Notice("No active editor file.")
				return
			}
			if (!currentFilePath.endsWith(".md")) {
				new Notice("Can only upload .md files")
			}
			this.convertToPdf(currentFilePath)
				.then(() => {
					new Notice('Converted to PDF successfully')
					this.uploadToRemarkable(currentFilePath)
						.then(() => {
							new Notice('Upload to reMarkable successful!');
						})
						.catch((e) => {
							new Notice("Failed to upload to reMarkable." + e)
						})
						.finally(() => {
							if (this.settings.cleanup) {
								this.cleanUp(currentFilePath)
							}
						})
				})
				.catch((e) => {
					new Notice('Failed to convert to PDF.' + e)
				})
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

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

class SampleSettingTab extends PluginSettingTab {
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
			.setName('Node path')
			.setDesc('Absolute path to Node on your system, e.g. the output of `which node`')
			.addText(text => text
				.setPlaceholder('Enter the absolute path to Node')
				.setValue(this.plugin.settings.nodePath)
				.onChange(async (value) => {
					this.plugin.settings.nodePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('md-to-pdf')
			.setDesc('Absolute path to md-to-pdf on your system, e.g. the output of `which md-to-pdf`')
			.addText(text => text
				.setPlaceholder('Enter the absolute path to md-to-pdf')
				.setValue(this.plugin.settings.md2pdfPath)
				.onChange(async (value) => {
					this.plugin.settings.md2pdfPath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('rmapi')
			.setDesc('Absolute path to rmapi on your system, e.g. the output of `which rmapi`')
			.addText(text => text
				.setPlaceholder('Enter the absolute path to rmapi')
				.setValue(this.plugin.settings.rmapiPath)
				.onChange(async (value) => {
					this.plugin.settings.rmapiPath = value;
					await this.plugin.saveSettings();
				}));

	}
}
