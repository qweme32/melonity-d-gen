// @ts-nocheck
import * as fs from 'fs';
import * as ts from 'typescript';

interface Data {
    class: Record<string, any>;
    interface: Record<string, any>;
    enum: Record<string, any>;
    functions: Record<string, any>;
}

const data: Data = {
    class: {},
    interface: {},
    enum: {},
    functions: {},
};

function getComments(node: ts.Node): string[] {
    const comments: string[] = [];
    if (node && node.jsDoc) {
        for (const comment of node.jsDoc) {
            if (comment.comment && comment.comment.startsWith(':docmd')) {
                comments.push(comment.comment.replace(':docmd', '').trim());
            }
        }
    }
    return comments;
}

function visitNode(node: ts.Node) {
    if (ts.isClassDeclaration(node)) {
        const className = node.name ? node.name.text : 'anonymous';
        const classInfo = {
            fields: {},
            methods: {},
        };

        for (const member of node.members) {
            if (
                ts.isPropertyDeclaration(member) ||
                ts.isMethodDeclaration(member)
            ) {
                const name = member.name ? member.name.text : 'anonymous';
                const comments = getComments(member);
                const doc = comments.join('\n');
                const entry = {
                    doc: doc,
                };

                if (ts.isPropertyDeclaration(member)) {
                    const type = member.type ? member.type.getText() : 'any';
                    entry.type = type;
                    classInfo.fields[name] = entry;
                } else if (ts.isMethodDeclaration(member)) {
                    const returnType = member.type
                        ? member.type.getText()
                        : 'any';
                    const argumentsInfo: any[] = [];
                    for (const parameter of member.parameters) {
                        if (ts.isIdentifier(parameter.name) && parameter.type) {
                            argumentsInfo.push({
                                name: parameter.name.text,
                                type: parameter.type.getText(),
                            });
                        }
                    }
                    entry.arguments = argumentsInfo;
                    entry.return = returnType;
                    classInfo.methods[name] = entry;
                }
            }
        }
        data.class[className] = classInfo;
    } else if (ts.isInterfaceDeclaration(node)) {
        const interfaceName = node.name ? node.name.text : 'anonymous';
        const interfaceInfo = {
            fields: {},
            methods: {},
        };

        for (const member of node.members) {
            if (
                ts.isPropertySignature(member) ||
                ts.isMethodSignature(member)
            ) {
                const name = member.name ? member.name.text : 'anonymous';
                const comments = getComments(member);
                const doc = comments.join('\n');
                const entry = {
                    doc: doc,
                };

                if (ts.isPropertySignature(member)) {
                    const type = member.type ? member.type.getText() : 'any';
                    entry.type = type;
                    interfaceInfo.fields[name] = entry;
                } else if (ts.isMethodSignature(member)) {
                    const returnType = member.type
                        ? member.type.getText()
                        : 'any';
                    const argumentsInfo: any[] = [];
                    for (const parameter of member.parameters) {
                        if (ts.isIdentifier(parameter.name) && parameter.type) {
                            argumentsInfo.push({
                                name: parameter.name.text,
                                type: parameter.type.getText(),
                            });
                        }
                    }
                    entry.arguments = argumentsInfo;
                    entry.return = returnType;
                    interfaceInfo.methods[name] = entry;
                }
            }
        }
        data.interface[interfaceName] = interfaceInfo;
    } else if (ts.isEnumDeclaration(node)) {
        const enumName = node.name ? node.name.text : 'anonymous';
        const enumInfo = {
            keys: {},
        };

        for (const enumMember of node.members) {
            const keyName = enumMember.name
                ? enumMember.name.text
                : 'anonymous';
            const comments = getComments(enumMember);
            const doc = comments.join('\n');
            const entry = {
                doc: doc,
            };
            if (enumMember.initializer) {
                entry.value = enumMember.initializer.text;
            }
            enumInfo.keys[keyName] = entry;
        }
        data.enum[enumName] = enumInfo;
    } else if (ts.isFunctionDeclaration(node) && ts.isIdentifier(node.name)) {
        const functionName = node.name.text;
        const comments = getComments(node);
        const doc = comments.join('\n');
        const functionInfo = {
            doc: doc,
            arguments: [],
        };
        if (node.type) {
            functionInfo.return = node.type.getText();
        }
        for (const parameter of node.parameters) {
            if (ts.isIdentifier(parameter.name) && parameter.type) {
                functionInfo.arguments.push({
                    name: parameter.name.text,
                    type: parameter.type.getText(),
                });
            }
        }
        data.functions[functionName] = functionInfo;
    }
    ts.forEachChild(node, visitNode);
}

export function parse(file: string): Data {
    const sourceCode = fs.readFileSync(file, 'utf8');

    const sourceFile = ts.createSourceFile(
        file,
        sourceCode,
        ts.ScriptTarget.Latest,
        true,
    );

    visitNode(sourceFile);

    return data;
}

fs.writeFileSync(
    `${process.argv[2]}.d.json`,
    JSON.stringify(parse(`${process.argv[2]}.d.ts`), null, 2),
);
