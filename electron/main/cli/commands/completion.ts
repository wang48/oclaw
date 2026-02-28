/**
 * Completion command handler - generates shell completion scripts
 */
import { printCommandHelp } from '../help';
import type { CommandContext, CommandResult } from '../types';

const BASH_COMPLETION = `_oclaw_completion() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"

  commands="status st openclaw oc gateway gw provider pv channel ch skill sk cron cr chat ct clawhub hub uv completion help"

  if [ $COMP_CWORD -eq 1 ]; then
    COMPREPLY=( $(compgen -W "$commands --help --version --json --verbose --quiet" -- "$cur") )
    return 0
  fi

  case "$prev" in
    gateway|gw)
      COMPREPLY=( $(compgen -W "status start stop restart health rpc" -- "$cur") )
      ;;
    provider|pv)
      COMPREPLY=( $(compgen -W "list get save update delete set-key delete-key has-key get-key set-default get-default" -- "$cur") )
      ;;
    channel|ch)
      COMPREPLY=( $(compgen -W "list get get-form save delete enable disable validate validate-credentials" -- "$cur") )
      ;;
    skill|sk)
      COMPREPLY=( $(compgen -W "status enable disable list-config get-config update-config" -- "$cur") )
      ;;
    cron|cr)
      COMPREPLY=( $(compgen -W "list create update delete toggle trigger" -- "$cur") )
      ;;
    chat|ct)
      COMPREPLY=( $(compgen -W "sessions history send abort" -- "$cur") )
      ;;
    clawhub|hub)
      COMPREPLY=( $(compgen -W "search explore install uninstall list" -- "$cur") )
      ;;
    openclaw|oc)
      COMPREPLY=( $(compgen -W "status paths cli-command install-cli-mac" -- "$cur") )
      ;;
    uv)
      COMPREPLY=( $(compgen -W "check install-all" -- "$cur") )
      ;;
    completion)
      COMPREPLY=( $(compgen -W "bash zsh" -- "$cur") )
      ;;
  esac
}

complete -F _oclaw_completion oclaw
`;

const ZSH_COMPLETION = `#compdef oclaw

_oclaw() {
  local -a commands
  commands=(
    'status:Show runtime summary'
    'st:Alias for status'
    'gateway:Gateway status and controls'
    'gw:Alias for gateway'
    'provider:Manage AI providers'
    'pv:Alias for provider'
    'channel:Manage channel configs'
    'ch:Alias for channel'
    'skill:Manage skill settings'
    'sk:Alias for skill'
    'cron:Manage scheduled jobs'
    'cr:Alias for cron'
    'chat:Chat sessions and messages'
    'ct:Alias for chat'
    'clawhub:Explore and install skills'
    'hub:Alias for clawhub'
    'openclaw:OpenClaw package and paths'
    'oc:Alias for openclaw'
    'uv:Check/install uv and Python'
    'completion:Generate shell completion scripts'
    'help:Show help'
  )

  _arguments -C \\
    '(--help -h)'{--help,-h}'[Show help]' \\
    '(--version -v)'{--version,-v}'[Show version]' \\
    '--json[Output as JSON]' \\
    '--verbose[Show debug logs]' \\
    '--quiet[Minimal output]' \\
    '1: :->command' \\
    '*::arg:->args'

  case $state in
    command)
      _describe 'command' commands
      ;;
    args)
      case $words[1] in
        gateway|gw)
          _arguments '1: :(status start stop restart health rpc)'
          ;;
        provider|pv)
          _arguments '1: :(list get save update delete set-key delete-key has-key get-key set-default get-default)'
          ;;
        channel|ch)
          _arguments '1: :(list get get-form save delete enable disable validate validate-credentials)'
          ;;
        skill|sk)
          _arguments '1: :(status enable disable list-config get-config update-config)'
          ;;
        cron|cr)
          _arguments '1: :(list create update delete toggle trigger)'
          ;;
        chat|ct)
          _arguments '1: :(sessions history send abort)'
          ;;
        clawhub|hub)
          _arguments '1: :(search explore install uninstall list)'
          ;;
        openclaw|oc)
          _arguments '1: :(status paths cli-command install-cli-mac)'
          ;;
        uv)
          _arguments '1: :(check install-all)'
          ;;
        completion)
          _arguments '1: :(bash zsh)'
          ;;
      esac
      ;;
  esac
}

_oclaw
`;

export async function handleCompletion(ctx: CommandContext): Promise<CommandResult> {
  const [shell] = ctx.args;

  if (!shell || shell === '--help' || shell === '-h') {
    printCommandHelp('completion');
    return { data: undefined };
  }

  switch (shell) {
    case 'bash':
      return { data: BASH_COMPLETION };
    case 'zsh':
      return { data: ZSH_COMPLETION };
    default:
      throw new Error('Usage: completion <bash|zsh>');
  }
}
