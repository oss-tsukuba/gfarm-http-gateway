package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"strings"
)

type Command struct {
	Name        string
	Description string
	Handler     func(*Client, []string) error
}

var commands = map[string]*Command{
	"ls": {
		Name:        "ls",
		Description: "List directory",
		Handler:     handleLs,
	},
	"download": {
		Name:        "download",
		Description: "Download file",
		Handler:     handleDownload,
	},
	"upload": {
		Name:        "upload",
		Description: "Upload file",
		Handler:     handleUpload,
	},
	"mkdir": {
		Name:        "mkdir",
		Description: "Create directory",
		Handler:     handleMkdir,
	},
	"rm": {
		Name:        "rm",
		Description: "Remove file",
		Handler:     handleRm,
	},
	"rmdir": {
		Name:        "rmdir",
		Description: "Remove directory",
		Handler:     handleRmdir,
	},
	"chmod": {
		Name:        "chmod",
		Description: "Change permissions",
		Handler:     handleChmod,
	},
	"stat": {
		Name:        "stat",
		Description: "File status",
		Handler:     handleStat,
	},
	"mv": {
		Name:        "mv",
		Description: "Move/rename",
		Handler:     handleMv,
	},
	"whoami": {
		Name:        "whoami",
		Description: "Show current user",
		Handler:     handleWhoami,
	},
	"copy": {
		Name:        "copy",
		Description: "Copy file",
		Handler:     handleCopy,
	},
	"ln": {
		Name:        "ln",
		Description: "Create link",
		Handler:     handleLn,
	},
	"tar": {
		Name:        "tar",
		Description: "archive files in parallel",
		Handler:     handleTar,
	},
	"getfacl": {
		Name:        "getfacl",
		Description: "get file access control lists",
		Handler:     handleGetfacl,
	},
	"setfacl": {
		Name:        "setfacl",
		Description: "set file access control lists",
		Handler:     handleSetfacl,
	},
	"gfuser": {
		Name:        "gfuser",
		Description: "get users list",
		Handler:     handleUsers,
	},
	"gfgroup": {
		Name:        "gfgroup",
		Description: "get groups list",
		Handler:     handleGroups,
	},
	"userinfo": {
		Name:        "userinfo",
		Description: "get user info",
		Handler:     handleUserInfo,
	},
	"zipdownload": {

		Name:        "zipdownload",
		Description: "download files as zip",
		Handler:     handleZipDownload,
	},
}

func exitErr(err error) {
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func showRootHelp() {
	fmt.Printf(`Usage: %s [global-options] <command> [command-options] [args]

Global options:
  -k, --insecure    Insecure TLS (skip verify)
  -v, --verbose     Verbose logging
  -h, --help        Show this help

Commands:
`, os.Args[0])
	for _, cmd := range commands {
		fmt.Printf("  %-8s  %s\n", cmd.Name, cmd.Description)
	}
}

func execCommand(client *Client, command string, args []string) {
	cmd, exists := commands[command]
	if !exists {
		fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
		showRootHelp()
		os.Exit(1)
	}

	exitErr(cmd.Handler(client, args))
}

func parseGlobal() (insecure, verbose bool, rest []string, showVersion bool) {
	insecure = false
	verbose = false
	showVersion = false

	args := os.Args[1:]
	for len(args) > 0 {
		args = expandCombinedShort(args, "kv")
		a := args[0]
		if !strings.HasPrefix(a, "-") {
			break
		}
		switch a {
		case "-k", "--insecure":
			insecure = true
		case "-v", "--verbose":
			verbose = true
		case "--version":
			showVersion = true
		case "-h", "--help":
			showRootHelp()
			os.Exit(0)
		default:
			fmt.Fprintf(os.Stderr, "Unknown global option: %s\n", a)
			os.Exit(1)
		}
		args = args[1:]
	}
	return insecure, verbose, args, showVersion
}

func handleLs(client *Client, args []string) error {

	args = expandCombinedShort(args, "aelTRj")

	fs := flag.NewFlagSet("ls", flag.ExitOnError)
	all := fs.Bool("a", false, "do not hide entries starting with '.'")
	eff := fs.Bool("e", false, "display effective permissions")
	longf := fs.Bool("l", false, "list in long format")
	timef := fs.Bool("T", false, "With the -l option, show complete date format")
	rec := fs.Bool("R", false, "recursively list subdirectories")
	json := fs.Bool("j", false, "output with json format")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("ls requires exactly 1 Gfarm-path")
	}
	return client.cmdLs(rest[0], *all, *eff, *longf, *timef, *rec, *json)
}

func handleDownload(client *Client, args []string) error {
	fs := flag.NewFlagSet("download", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("download requires Gfarm-path and Local-path")
	}
	return client.cmdDownload(rest[0], rest[1])
}

func handleUpload(client *Client, args []string) error {
	fs := flag.NewFlagSet("upload", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("upload requires Local-path and Gfarm-path")
	}
	return client.cmdUpload(rest[0], rest[1])
}

func handleMkdir(client *Client, args []string) error {
	fs := flag.NewFlagSet("mkdir", flag.ExitOnError)

	parents := fs.Bool("p", false, "Even if the specified directory exists, do not return error. Create parent directories if needed.")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("ls requires exactly 1 Gfarm-path")
	}

	return client.cmdMkdir(rest[0], *parents)
}

func handleRm(client *Client, args []string) error {
	args = expandCombinedShort(args, "rf")
	fs := flag.NewFlagSet("rm", flag.ExitOnError)

	force := fs.Bool("f", false, "ignore nonexistent files and arguments, never prompt")
	recursive := fs.Bool("r", false, "remove directories and their contents recursively")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("rm requires exactly 1 Gfarm-path")
	}
	return client.cmdRm(rest[0], *force, *recursive)
}

func handleRmdir(client *Client, args []string) error {
	fs := flag.NewFlagSet("rmdir", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("rmdir requires exactly 1 Gfarm-path")
	}
	return client.cmdRmdir(rest[0])
}

func handleChmod(client *Client, args []string) error {
	fs := flag.NewFlagSet("chmod", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("chmod requires mode(octal) and Gfarm-path")
	}
	return client.cmdChmod(rest[0], rest[1])
}

func handleStat(client *Client, args []string) error {
	fs := flag.NewFlagSet("stat", flag.ExitOnError)

	check_sum := fs.Bool("C", false, "show checksum")
	check_symlink := fs.Bool("l", false, "does not follow symbolic links, but show the link information itself")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("stat requires exactly 1 Gfarm-path")
	}
	return client.cmdStat(rest[0], *check_sum, *check_symlink)
}

func handleMv(client *Client, args []string) error {
	fs := flag.NewFlagSet("mv", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("mv requires source and destination")
	}
	return client.cmdMv(rest[0], rest[1])
}

func handleWhoami(client *Client, args []string) error {
	fs := flag.NewFlagSet("whoami", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	if len(fs.Args()) != 0 {
		return fmt.Errorf("whoami takes no arguments")
	}
	return client.cmdWhoami()
}

func handleCopy(client *Client, args []string) error {
	fs := flag.NewFlagSet("copy", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("copy requires source and destination")
	}
	return client.cmdCopy(rest[0], rest[1])
}

func handleLn(client *Client, args []string) error {
	fs := flag.NewFlagSet("ln", flag.ExitOnError)

	symlink := fs.Bool("s", false, "Create a symbolic link")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 2 {
		return fmt.Errorf("copy requires source and destination")
	}
	return client.cmdLn(rest[0], rest[1], *symlink)
}

func handleTar(client *Client, args []string) error {
	fs := flag.NewFlagSet("tar", flag.ExitOnError)

	create := fs.String("c", "", " Create tar files in OUTDIR from MEMBERs")
	appendf := fs.String("r", "", "Append files to new tar files")
	update := fs.String("u", "", " Append only files (to new tar files) newer than same entries in existing tar files")
	extract := fs.String("x", "", "Extract all entries or specified MEMBERs from INDIR to OUTDIR")
	listDir := fs.String("t", "", "List the members of DIR")

	basedir := fs.String("C", "", "Change to directory for MEMBERs")

	if err := fs.Parse(args); err != nil {
		return err
	}

	// determine command
	cmdCount := 0
	var cmd string
	var outdir string

	if *create != "" {
		cmd, outdir, cmdCount = "c", *create, cmdCount+1
	}
	if *appendf != "" {
		cmd, outdir, cmdCount = "r", *appendf, cmdCount+1
	}
	if *update != "" {
		cmd, outdir, cmdCount = "u", *update, cmdCount+1
	}
	if *extract != "" {
		cmd, outdir, cmdCount = "x", *extract, cmdCount+1
	}
	if *listDir != "" {
		cmd, outdir, cmdCount = "t", *listDir, cmdCount+1
	}
	if cmdCount != 1 {
		return fmt.Errorf("tar requires exactly one of -c OUTDIR, -r OUTDIR, -u OUTDIR, -x OUTDIR, or -t DIR")
	}

	rest := fs.Args()

	switch cmd {
	case "c", "r", "u":
		// -c/-r/-u OUTDIR [-C DIR] [--] MEMBER...
		if len(rest) == 0 {
			return fmt.Errorf("tar -%s requires at least one MEMBER", cmd)
		}

		return client.cmdTar(cmd, outdir, *basedir, rest, nil)

	case "x":
		// -x OUTDIR [--] INDIR [MEMBER...]
		if len(rest) < 1 {
			return fmt.Errorf("tar -x requires INDIR")
		}
		indir := rest[0]
		members := rest[1:]

		return client.cmdTar("x", outdir, indir, members, nil)

	case "t":
		// -t DIR
		if *listDir == "" {
			return fmt.Errorf("tar -t requires DIR")
		}
		return client.cmdTar("t", "", outdir, []string{*listDir}, nil)
	}

	return fmt.Errorf("unreachable")
}

func handleGetfacl(client *Client, args []string) error {
	fs := flag.NewFlagSet("getfacl", flag.ExitOnError)
	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("stat requires exactly 1 Gfarm-path")
	}
	return client.cmdGetfacl(rest[0])
}

func handleSetfacl(client *Client, args []string) error {
	fs := flag.NewFlagSet("setfacl", flag.ExitOnError)

	fromFile := fs.String("M", "", "read ACL entries from FILE ('-' for stdin)")

	if err := fs.Parse(args); err != nil {
		return err
	}
	rest := fs.Args()
	if len(rest) != 1 {
		return fmt.Errorf("stat requires exactly 1 Gfarm-path")
	}

	if *fromFile == "" {
		return fmt.Errorf("setfacl requires -M FILE (gfgetfacl output)")
	}

	// Read ACL text from a file or stdin
	var r io.Reader
	if *fromFile == "-" {
		r = os.Stdin
	} else {
		f, err := os.Open(*fromFile)
		if err != nil {
			return fmt.Errorf("open %s: %w", *fromFile, err)
		}
		defer f.Close()
		r = f
	}

	aclText, err := io.ReadAll(r)
	if err != nil {
		return fmt.Errorf("read ACL file: %w", err)
	}

	return client.cmdSetfacl(rest[0], string(aclText))
}

func handleUsers(client *Client, args []string) error {
	fs := flag.NewFlagSet("gfuser", flag.ExitOnError)

	long_format := fs.Bool("l", false, "long format")

	if err := fs.Parse(args); err != nil {
		return err
	}

	return client.cmdUsers(*long_format)
}

func handleGroups(client *Client, args []string) error {
	fs := flag.NewFlagSet("gfgroup", flag.ExitOnError)

	long_format := fs.Bool("l", false, "long format")

	if err := fs.Parse(args); err != nil {
		return err
	}

	return client.cmdGroups(*long_format)
}

func handleUserInfo(client *Client, args []string) error {
	fs := flag.NewFlagSet("userinfo", flag.ExitOnError)

	if err := fs.Parse(args); err != nil {
		return err
	}
	if len(fs.Args()) != 0 {
		return fmt.Errorf("userinfo takes no arguments")
	}
	return client.cmdUserInfo()
}

func handleZipDownload(client *Client, args []string) error {
	fs := flag.NewFlagSet("zip", flag.ExitOnError)
	out := fs.String("o", "-", "output zip file (\"-\" for stdout)")

	if err := fs.Parse(args); err != nil {
		return err
	}
	paths := fs.Args()
	if len(paths) == 0 {
		return fmt.Errorf("zip requires at least 1 Gfarm path")
	}
	return client.cmdZip(paths, *out)
}
